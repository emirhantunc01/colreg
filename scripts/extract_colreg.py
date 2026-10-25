"""Build the COLREG source dataset from the owner-supplied Turkish PDF.

The Turkish source text is copied from pypdf without translation or OCR. English
fields are short educational finding aids, not an official translation.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
import shutil
from pathlib import Path
from typing import NamedTuple

from pypdf import PdfReader


SOURCE_TITLE = "Denizde Çatışmanın Önlenmesine İlişkin Uluslararası Kurallar Hakkında Sözleşme (COLREG-72)"
HEADING = re.compile(r"^\s*(KURAL\s+(\d+)\s*-?|LAHİKA\s+(IV|I{1,3}))\s*(.*)$")
CLAUSE = re.compile(r"^\s*(\([a-zçğıöşü]\)|\([ivxlcdm]+\)|\d+\.)\s*", re.IGNORECASE)


# English labels and paraphrases are intentionally concise and clearly secondary
# to the preserved Turkish text. Key = stable output id.
META = {
    "rule-1": ("Application", "Defines the waters and vessels covered, while preserving compatible local and special rules.", "Apply these Rules to vessels on the high seas and connected navigable waters."),
    "rule-2": ("Responsibility", "Keeps responsibility for neglect, required precautions, and departures needed to avoid immediate danger.", "Account for every danger of navigation and take precautions required by ordinary seamanship."),
    "rule-3": ("General definitions", "Defines the vessel types, operating states, and visibility terms used throughout the Rules.", "Use these definitions consistently when deciding which rules and signals apply."),
    "rule-4": ("Application of conduct rules", "Introduces the conduct-of-vessels rules for every visibility condition.", "Apply this section in all visibility conditions."),
    "rule-5": ("Look-out", "Requires a continuous look-out by sight, hearing, and all available means.", "Maintain a proper look-out sufficient to appraise the situation and collision risk."),
    "rule-6": ("Safe speed", "Requires a speed that permits effective avoiding action and stopping within an appropriate distance.", "Set safe speed after considering visibility, traffic, manoeuvrability, weather, hazards, draft, and radar limits."),
    "rule-7": ("Risk of collision", "Explains how to use all available means, including radar, to determine collision risk.", "Treat doubt as collision risk and avoid conclusions based on scanty information."),
    "rule-8": ("Action to avoid collision", "Sets the qualities of effective avoiding action and safe passing distance.", "Make positive, timely, readily apparent action and monitor it until finally past and clear."),
    "rule-9": ("Narrow channels", "Sets navigation, crossing, overtaking, anchoring, and signal duties in narrow channels and fairways.", "Keep near the starboard outer limit when safe and do not impede vessels confined to the channel."),
    "rule-10": ("Traffic separation schemes", "Sets conduct for using traffic lanes, separation zones, inshore zones, and crossings.", "Proceed with traffic flow, keep clear of separation lines, and cross lanes as nearly at right angles as practicable."),
    "rule-11": ("Application in sight", "Introduces the rules governing vessels that can see one another.", "Apply this section when vessels are in sight of one another."),
    "rule-12": ("Sailing vessels", "Allocates right of way between sailing vessels by tack and windward position.", "The vessel designated to keep out of the way must take early avoiding action."),
    "rule-13": ("Overtaking", "Makes the overtaking vessel responsible for keeping clear until finally past and clear.", "When overtaking, keep out of the way regardless of later bearing changes."),
    "rule-14": ("Head-on situation", "Requires two power-driven vessels meeting head-on to alter course to starboard.", "Alter to starboard so each vessel passes on the port side of the other."),
    "rule-15": ("Crossing situation", "Requires the power-driven vessel with the other on her starboard side to keep out of the way.", "Avoid crossing ahead when circumstances permit."),
    "rule-16": ("Action by give-way vessel", "Requires the give-way vessel to act early and substantially.", "Take early and substantial action to keep well clear."),
    "rule-17": ("Action by stand-on vessel", "Explains when the stand-on vessel should maintain course and speed and when she must act.", "Initially keep course and speed; act when the give-way vessel is not acting or collision cannot be avoided alone."),
    "rule-18": ("Responsibilities between vessels", "Sets the general hierarchy among power-driven, sailing, fishing, constrained, and disabled vessels.", "Keep clear according to vessel status while observing the special limits stated in the rule."),
    "rule-19": ("Conduct in restricted visibility", "Requires safe speed, ready engines, radar assessment, cautious avoiding action, and reduced speed when risk develops.", "Navigate with extreme caution when vessels are not in sight in or near restricted visibility."),
    "rule-20": ("Application of lights and shapes", "States when prescribed lights and day shapes must be displayed.", "Display lights from sunset to sunrise and in restricted visibility; display shapes by day."),
    "rule-21": ("Light definitions", "Defines masthead, sidelights, sternlight, towing light, all-round light, and flashing light.", "Interpret navigation-light terms by their specified colour and arc of visibility."),
    "rule-22": ("Visibility of lights", "Sets minimum nominal ranges for navigation lights by vessel length.", "Fit lights that meet the stated minimum visibility ranges."),
    "rule-23": ("Power-driven vessels underway", "Specifies lights for power-driven vessels underway, including small craft and air-cushion vessels.", "Show the required masthead, side, and stern lights for vessel size and operation."),
    "rule-24": ("Towing and pushing", "Specifies lights and shapes for towing, pushing, composite units, and inconspicuous tows.", "Display the configuration that identifies the towing method and length, and mark the tow itself."),
    "rule-25": ("Sailing vessels and vessels under oars", "Specifies lights and shapes for sailing vessels underway and vessels being rowed.", "Show sidelights and sternlight, with the stated alternatives for small sailing or rowing vessels."),
    "rule-26": ("Fishing vessels", "Specifies signals for trawling and other fishing, including gear extending from the vessel.", "Show the fishing lights and shapes only when engaged in fishing, plus underway lights when making way."),
    "rule-27": ("Not under command or restricted in ability to manoeuvre", "Specifies signals for disabled vessels and vessels restricted by their work.", "Show the prescribed red/white all-round lights, shapes, and directional obstruction signals for the operation."),
    "rule-28": ("Vessels constrained by draft", "Allows a power-driven vessel constrained by draft to identify that condition.", "In addition to power-driven-vessel signals, display the stated three red lights or cylinder when used."),
    "rule-29": ("Pilot vessels", "Specifies identifying lights and additional underway or anchor signals for vessels on pilotage duty.", "Show white over red while engaged on pilotage duty and add the applicable underway or anchor signals."),
    "rule-30": ("Anchored and aground vessels", "Specifies lights and shapes for vessels at anchor and aground, with small-vessel provisions.", "Display the required anchor signals and add red lights and three balls when aground."),
    "rule-31": ("Seaplanes", "Provides equivalent signals where a seaplane or wing-in-ground craft cannot display the exact prescribed arrangement.", "Display lights and shapes as close as possible in characteristics and position to those prescribed."),
    "rule-32": ("Sound-signal definitions", "Defines whistle, short blast, and prolonged blast.", "Use the defined durations and compliant sound-signalling appliances."),
    "rule-33": ("Equipment for sound signals", "Sets whistle, bell, and gong carriage requirements by vessel length.", "Carry the sound equipment required for vessel length or an effective alternative where permitted."),
    "rule-34": ("Manoeuvring and warning signals", "Defines whistle and light signals for manoeuvres, overtaking, doubt, and bends.", "Signal manoeuvres and warnings with the prescribed blast patterns and respond where required."),
    "rule-35": ("Sound signals in restricted visibility", "Sets periodic sound signals by vessel status in or near restricted visibility.", "Make the prescribed signal at intervals no longer than stated for the vessel's current status."),
    "rule-36": ("Signals to attract attention", "Permits non-confusing attention signals while restricting misleading or dazzling lights.", "Use attention signals that cannot be mistaken for navigation aids or prescribed signals."),
    "rule-37": ("Distress signals", "Directs vessels in distress and needing assistance to the signals listed in Annex IV.", "Use or exhibit the Annex IV distress signals when in distress and requiring assistance."),
    "rule-38": ("Exemptions", "Preserves limited exemptions for older vessels while requiring eventual compliance in specified areas.", "Apply only the expressly stated transitional exemptions and time limits."),
    "rule-39": ("Audit definitions", "Defines audit-related terms used in the convention compliance provisions.", "Use the stated meanings for audit, audit scheme, implementation code, and audit standard."),
    "rule-40": ("Application of the implementation code", "Requires contracting parties to use the implementation code when carrying out convention duties.", "Use the implementation code to discharge obligations and responsibilities under the Convention."),
    "rule-41": ("Verification of compliance", "Establishes periodic IMO audits and responsibilities for administering the audit scheme.", "Undergo periodic audits and facilitate implementation of the audit programme under the stated standard."),
    "annex-1": ("Positioning and technical details of lights and shapes", "Gives technical placement, spacing, sectors, intensity, colour, and approval requirements for lights and shapes.", "Install and approve lights and shapes to the detailed geometry and performance requirements."),
    "annex-2": ("Additional signals for fishing vessels fishing close together", "Defines optional additional signals for trawlers and purse seiners operating near one another.", "When these signals are used, place and display them separately from the Rule 26 signals as specified."),
    "annex-3": ("Technical details of sound signal appliances", "Sets frequency, audibility, sound-pressure, positioning, and construction requirements for whistles, bells, and gongs.", "Provide sound appliances that meet the stated acoustic performance and installation criteria."),
    "annex-4": ("Distress signals", "Lists internationally recognized signals indicating distress and need of assistance.", "Use the listed signals only to indicate distress and need of assistance, and do not misuse them."),
}


CONDITIONS = {
    "rule-1": ["Vessels are on the high seas or in waters connected with them and navigable by seagoing vessels."],
    "rule-2": ["A vessel, owner, master, or crew is deciding how to comply with the Rules in the actual dangers and special circumstances."],
    "rule-3": ["A term defined here is used elsewhere in the Rules, unless the context expressly provides otherwise."],
    "rule-4": ["A vessel is applying Rules 4–10, in any condition of visibility."],
    "rule-5": ["At all times while a vessel is navigating or otherwise exposed to collision risk."],
    "rule-6": ["At all times; radar-specific factors also apply when operational radar is fitted."],
    "rule-7": ["Another vessel may present a close-quarters situation or collision risk; doubt counts as risk."],
    "rule-8": ["Action is being selected or monitored to avoid collision or allow more time to assess the situation."],
    "rule-9": ["A vessel proceeds along, crosses, overtakes in, approaches a bend in, or anchors in a narrow channel or fairway."],
    "rule-10": ["A vessel uses, joins, leaves, crosses, fishes near, or navigates near an adopted traffic separation scheme."],
    "rule-11": ["The vessels can see one another."],
    "rule-12": ["Two sailing vessels approach with collision risk."],
    "rule-13": ["A vessel approaches another from more than 22.5 degrees abaft her beam; doubt means she must assume she is overtaking."],
    "rule-14": ["Two power-driven vessels meet on reciprocal or nearly reciprocal courses with collision risk; doubt means head-on is assumed."],
    "rule-15": ["Two power-driven vessels cross with collision risk."],
    "rule-16": ["A vessel is required by the Rules to keep out of another vessel's way."],
    "rule-17": ["One of two vessels must keep out of the way and the other is the stand-on vessel."],
    "rule-18": ["Vessels of different operational status are in sight and risk of collision exists."],
    "rule-19": ["Vessels are not in sight of one another while navigating in or near restricted visibility."],
    "rule-20": ["Lights are required from sunset to sunrise and during restricted visibility; shapes apply by day."],
    "rule-21": ["A light term or prescribed arc is interpreted for Rules 20–31."],
    "rule-22": ["A vessel selects lights with minimum nominal range based on its length and light type."],
    "rule-23": ["A power-driven vessel is underway, including the special cases of vessels under 12 metres, under 7 metres, and air-cushion craft."],
    "rule-24": ["A power-driven vessel tows or pushes, or a vessel or object is being towed; configurations depend on tow length and method."],
    "rule-25": ["A sailing vessel or vessel under oars is underway; special alternatives depend on length."],
    "rule-26": ["A vessel is engaged in fishing that restricts manoeuvrability; signals differ for trawling and fishing other than trawling."],
    "rule-27": ["A vessel is not under command or is restricted in ability to manoeuvre because of the nature of her work."],
    "rule-28": ["A power-driven vessel is constrained by her draft in relation to available depth and width."],
    "rule-29": ["A vessel is engaged on pilotage duty, whether underway or at anchor."],
    "rule-30": ["A vessel is at anchor or aground; alternative requirements depend on length and whether grounding signals are practicable."],
    "rule-31": ["A seaplane or wing-in-ground craft cannot display lights or shapes in the exact prescribed characteristics or positions."],
    "rule-32": ["Sound-signal terms and blast durations are interpreted for Rules 33–37."],
    "rule-33": ["Sound equipment is selected by vessel length: 12 metres, 20 metres, and 100 metres are the principal thresholds."],
    "rule-34": ["Vessels are in sight, or a vessel approaches an obscured bend or channel reach; specified signals also govern overtaking agreement."],
    "rule-35": ["A vessel is in or near restricted visibility, by day or night; the signal depends on operational status."],
    "rule-36": ["A vessel needs to attract another vessel's attention without creating confusion."],
    "rule-37": ["A vessel is in distress and requires assistance."],
    "rule-38": ["A vessel was built, or was at an equivalent stage of construction, before the Rules entered into force and complied with the 1960 Rules."],
    "rule-39": ["The convention's audit and compliance provisions use the terms audit, audit scheme, implementation code, or audit standard."],
    "rule-40": ["A contracting party performs its obligations and responsibilities under the Convention."],
    "rule-41": ["A contracting party is scheduled for periodic IMO audit under the audit standard and audit scheme."],
    "annex-1": ["A vessel installs, positions, screens, or seeks approval for lights and shapes required by the Rules."],
    "annex-2": ["Fishing vessels fish close together and elect to show the additional signals authorized by Rule 26(d)."],
    "annex-3": ["A whistle, bell, gong, or equivalent sound appliance is fitted or used to satisfy the Rules."],
    "annex-4": ["A vessel communicates distress and need of assistance using one or more recognized signals."],
}


EXCEPTIONS = {
    "rule-1": ["Compatible special local rules may apply in connected roadsteads, harbours, rivers, lakes, and inland waterways.", "Governments may prescribe non-confusing additional signals for warships, convoy vessels, or fishing fleets.", "Special-purpose construction may use the closest possible compliant arrangement determined by the Ministry in this PDF."],
    "rule-2": ["A departure from the Rules is permitted only when necessary to avoid immediate danger in special circumstances."],
    "rule-6": ["No fixed numerical speed is declared safe; the listed factors must be evaluated for the actual conditions."],
    "rule-7": ["An appreciable bearing change can still involve risk for a very large vessel, a tow, or a vessel at close range."],
    "rule-8": ["Successive small alterations should be avoided; slackening speed or stopping propulsion may be used when necessary."],
    "rule-9": ["A vessel under 20 metres, sailing vessel, or fishing vessel must not impede a vessel that can safely navigate only in the channel.", "Crossing is prohibited when it would impede such a vessel; anchoring should be avoided where circumstances permit.", "Overtaking in a narrow channel requires agreement when the vessel being overtaken must act to permit safe passage."],
    "rule-10": ["Entry into or crossing a separation zone is limited to emergencies, avoiding immediate danger, or fishing within the zone.", "Inshore traffic zones have stated exceptions for small vessels, sailing vessels, fishing vessels, port access, offshore installations, and immediate danger.", "Vessels restricted by navigation-safety work or submarine-cable work are exempt only to the extent necessary for that work."],
    "rule-12": ["When both sailing vessels have wind on the same side, the windward vessel keeps clear; on different tacks, the vessel with wind on the port side keeps clear.", "A port-tack vessel unable to determine the other vessel's tack must keep clear."],
    "rule-13": ["Later alteration of bearing does not convert the overtaking vessel into a crossing vessel or end her duty before finally past and clear."],
    "rule-17": ["The stand-on vessel may act when it becomes apparent that the give-way vessel is not taking appropriate action.", "The stand-on vessel must act when collision cannot be avoided by the give-way vessel alone; a power-driven stand-on vessel should, if circumstances permit, avoid altering to port for a vessel on her own port side.", "Action by the stand-on vessel does not relieve the give-way vessel of her duty."],
    "rule-18": ["Rules 9, 10, and 13 override the general hierarchy where they expressly apply.", "A vessel constrained by draft is given special consideration rather than an unconditional stand-on status.", "Seaplanes and wing-in-ground craft must keep well clear when taking off, landing, or flying near the surface where practicable."],
    "rule-19": ["Avoid altering to port for a vessel forward of the beam, except when overtaking, and avoid altering toward a vessel abeam or abaft the beam.", "The duty to reduce to minimum steerage speed, take all way off if necessary, and navigate with extreme caution does not apply after determining that collision risk does not exist."],
    "rule-20": ["No other lights may be shown if they can be mistaken for prescribed lights, impair their visibility or character, or interfere with a proper look-out."],
    "rule-22": ["Minimum ranges vary by vessel length: 50 metres or more, 12–49 metres, and under 12 metres, with a separate towing-light requirement."],
    "rule-23": ["A power-driven vessel under 12 metres may show one all-round white light and sidelights; under 7 metres and not exceeding 7 knots may show an all-round white light and, if practicable, sidelights.", "A second masthead light is optional below 50 metres; air-cushion vessels in non-displacement mode add a flashing yellow light."],
    "rule-24": ["A rigid composite unit is treated as a power-driven vessel rather than as a tow.", "Tow length exceeding 200 metres triggers a third masthead light and diamond shape.", "Inconspicuous or partly submerged tows have additional all-round white lights and diamond shapes; where compliance is impracticable, all possible measures must indicate the tow."],
    "rule-25": ["A sailing vessel under 20 metres may combine sidelights and sternlight in one lantern at or near the masthead.", "A sailing vessel under 7 metres and a vessel under oars may keep an electric torch or white light ready when the prescribed lights are not displayed.", "A vessel proceeding under sail and machinery must show a cone apex downward by day."],
    "rule-26": ["Fishing signals apply only while engaged in fishing; when not fishing, the vessel shows the signals for a vessel of her length.", "Gear extending more than 150 metres horizontally requires an additional all-round white light or cone in the gear's direction.", "Additional close-proximity fishing signals are addressed in Annex II."],
    "rule-27": ["A vessel restricted by towing shows these signals only when the tow severely restricts deviation from course.", "Dredging and underwater operations add two red lights or balls on the obstructed side and two green lights or diamonds on the safe side.", "Mine-clearance vessels add three green all-round lights or balls and other vessels should not approach within 1,000 metres.", "Diving operations on a vessel too small for the full display use the specified red-white-red lights and a rigid Code Flag A."],
    "rule-28": ["The three red lights or cylinder identify constrained draft in addition to the ordinary Rule 23 power-driven-vessel lights."],
    "rule-29": ["A pilot vessel not engaged on pilotage duty displays the lights or shapes for a similar vessel of her length."],
    "rule-30": ["A vessel under 50 metres may use one all-round white anchor light instead of two; vessels of 100 metres or more must also illuminate decks.", "A vessel under 7 metres outside a channel, fairway, anchorage, or usual navigation area need not show anchor signals.", "A vessel under 12 metres need not show the additional aground red lights and three balls."],
    "rule-31": ["Equivalent placement is allowed only where exact display is impossible, and must approximate the prescribed characteristics and positions as closely as possible."],
    "rule-33": ["Vessels under 12 metres need not carry the specified appliances but must have another means of making an efficient sound signal."],
    "rule-34": ["Light signals may supplement whistle signals and must repeat for the duration of the manoeuvre.", "In a narrow channel, the overtaken vessel sounds agreement only when in agreement; at least five short rapid blasts indicate doubt or danger."],
    "rule-35": ["Signals are made at intervals of no more than two minutes, except anchor bell signals and aground additions at intervals of no more than one minute.", "A vessel under 12 metres may use another efficient sound signal at intervals of no more than two minutes.", "Pilot vessels may add four short blasts to the signal otherwise required."],
    "rule-36": ["Attention lights must not be mistaken for aids to navigation or prescribed signals; high-intensity intermittent or revolving lights should be avoided."],
    "rule-38": ["Each exemption is limited to the equipment, relocation, metric conversion, or transition period expressly listed; several expire four or nine years after entry into force."],
    "annex-2": ["These additional signals are optional and must be at least 0.9 metres apart, below the principal fishing lights, visible all round for at least one mile, and distinct from required lights."],
    "annex-4": ["Use or display of these signals for any purpose other than distress and need of assistance is prohibited, as is use of signals liable to be confused with them."],
}


RELATED = {
    "rule-4": ["rule-5", "rule-6", "rule-7", "rule-8", "rule-9", "rule-10"],
    "rule-11": ["rule-12", "rule-13", "rule-14", "rule-15", "rule-16", "rule-17", "rule-18"],
    "rule-12": ["rule-16"], "rule-14": ["rule-16"], "rule-15": ["rule-16"],
    "rule-16": ["rule-17"], "rule-17": ["rule-16"],
    "rule-20": ["rule-21", "rule-22", "annex-1"],
    "rule-21": ["rule-22", "annex-1"], "rule-22": ["annex-1"],
    "rule-23": ["rule-20", "rule-21", "rule-22", "annex-1"],
    "rule-24": ["rule-23", "annex-1"], "rule-25": ["annex-1"],
    "rule-26": ["annex-2"], "rule-27": ["annex-1"], "rule-28": ["rule-23"],
    "rule-29": ["rule-30"], "rule-31": ["annex-1"],
    "rule-32": ["rule-33", "rule-34", "rule-35", "annex-3"],
    "rule-33": ["annex-3"], "rule-34": ["rule-9"], "rule-35": ["annex-3"],
    "rule-37": ["annex-4"], "annex-1": ["rule-20", "rule-21", "rule-22"],
    "annex-2": ["rule-26"], "annex-3": ["rule-33", "rule-35"], "annex-4": ["rule-37"],
}


NOTES = {
    "rule-1": ["Source discrepancy: Rule 1(d) says traffic separation schemes may be established by the Bakanlık (Ministry); the corresponding IMO English wording says they may be adopted by the Organization."],
    "rule-10": ["Source discrepancy: Rule 10(a) applies to schemes adopted by the Bakanlık (Ministry); the corresponding IMO English wording refers to schemes adopted by the Organization."],
}


PARTS = {
    **{f"rule-{n}": "A" for n in range(1, 4)},
    **{f"rule-{n}": "B" for n in range(4, 20)},
    **{f"rule-{n}": "C" for n in range(20, 32)},
    **{f"rule-{n}": "D" for n in range(32, 38)},
    "rule-38": "E",
    **{f"rule-{n}": "F" for n in range(39, 42)},
    **{f"annex-{n}": "Annexes" for n in range(1, 5)},
}


class Line(NamedTuple):
    text: str
    page: int


def _record_id(rule: str | None, annex: str | None) -> str:
    if rule:
        return f"rule-{int(rule)}"
    roman = {"I": 1, "II": 2, "III": 3, "IV": 4}
    return f"annex-{roman[annex or 'I']}"


def _split_clauses(record_id: str, lines: list[Line]) -> list[dict]:
    groups: list[list[Line]] = []
    current: list[Line] = []
    for line in lines:
        if CLAUSE.match(line.text) and current:
            groups.append(current)
            current = []
        current.append(line)
    if current:
        groups.append(current)

    clauses = []
    for index, group in enumerate(groups, 1):
        text = "\n".join(item.text.rstrip() for item in group).strip()
        if not text:
            continue
        clauses.append({
            "id": f"{record_id}-clause-{index:02d}",
            "text": text,
            "pages": sorted({item.page for item in group if item.text.strip()}),
        })
    return clauses


def _parse_records(page_texts: list[str]) -> list[dict]:
    buckets: dict[str, list[Line]] = {}
    current_id: str | None = None
    for page_number, text in enumerate(page_texts, 1):
        for raw_line in text.splitlines():
            match = HEADING.match(raw_line)
            if match:
                current_id = _record_id(match.group(2), match.group(3))
                buckets.setdefault(current_id, [])
                continue
            if re.match(r"^\s*(BÖLÜM|KISIM)\s", raw_line):
                continue
            if current_id == "rule-27" and not buckets[current_id] and raw_line.strip() == "Tekneler":
                continue
            if current_id:
                buckets[current_id].append(Line(raw_line, page_number))

    order = [f"rule-{n}" for n in range(1, 42)] + [f"annex-{n}" for n in range(1, 5)]
    records = []
    for record_id in order:
        clauses = _split_clauses(record_id, buckets.get(record_id, []))
        title, summary, duty = META[record_id]
        source_text = "\n\n".join(clause["text"] for clause in clauses)
        related_numbers = sorted({int(value) for value in re.findall(r"Kural\s+(\d+)", source_text, re.IGNORECASE)})
        related = [f"rule-{number}" for number in related_numbers if f"rule-{number}" != record_id and number <= 41]
        related = list(dict.fromkeys(related + RELATED.get(record_id, [])))
        pages = sorted({page for clause in clauses for page in clause["pages"]})
        is_annex = record_id.startswith("annex-")
        number = int(record_id.split("-")[1])
        keywords = sorted({word.lower().strip("(),") for word in title.split() if len(word) > 3})
        records.append({
            "id": record_id,
            "number": number,
            "title": title,
            "part": PARTS[record_id],
            "summary": summary,
            "conditions": CONDITIONS[record_id],
            "duties": [duty],
            "exceptions": EXCEPTIONS.get(record_id, []),
            "related": related,
            "keywords": keywords + (["annex"] if is_annex else ["rule"]),
            "pages": pages,
            "clauses": clauses,
            "sourceText": source_text,
            "notes": NOTES.get(record_id, []),
        })
    return records


def build(source_pdf: Path, output_root: Path) -> None:
    source_pdf = source_pdf.resolve()
    reader = PdfReader(str(source_pdf))
    page_texts = [page.extract_text() or "" for page in reader.pages]
    if len(page_texts) != 25:
        raise ValueError(f"Expected 25 PDF pages, found {len(page_texts)}")

    public_content = output_root / "public" / "content"
    content = output_root / "content"
    public_content.mkdir(parents=True, exist_ok=True)
    content.mkdir(parents=True, exist_ok=True)

    copied_pdf = public_content / "colreg-source.pdf"
    shutil.copyfile(source_pdf, copied_pdf)
    digest = hashlib.sha256(source_pdf.read_bytes()).hexdigest()
    records = _parse_records(page_texts)
    payload = {
        "source": {"title": SOURCE_TITLE, "file": "content/colreg-source.pdf", "sha256": digest, "pages": len(page_texts)},
        "records": records,
    }
    (public_content / "rules.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    raw_pages = [{"page": index, "text": text} for index, text in enumerate(page_texts, 1)]
    (content / "raw-pages.json").write_text(json.dumps(raw_pages, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    raw_text = "\n".join(f"===== PDF PAGE {item['page']} =====\n{item['text'].rstrip()}\n" for item in raw_pages)
    (content / "raw-pages.txt").write_text(raw_text, encoding="utf-8")

    with (content / "clause-coverage.csv").open("w", encoding="utf-8", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(["record_id", "clause_id", "pages", "characters", "extracted", "compared", "visualized", "tested"])
        for record in records:
            for clause in record["clauses"]:
                writer.writerow([record["id"], clause["id"], "|".join(map(str, clause["pages"])), len(clause["text"]), "true", "false", "false", "false"])


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("--output-root", type=Path, default=Path(__file__).resolve().parents[1])
    args = parser.parse_args()
    build(args.source, args.output_root.resolve())


if __name__ == "__main__":
    main()
