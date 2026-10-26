import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "public", "scenarios");
const duration = 90;
const reference = JSON.parse(await readFile(path.join(root, "public", "content", "rules.json"), "utf8"));
const sourceRecords = new Map(reference.records.map((record) => [record.id, record]));

function pagesForRules(ruleNumbers) {
  const pages = [...new Set(ruleNumbers.flatMap((number) => sourceRecords.get(`rule-${number}`)?.pages ?? []))].sort((a, b) => a - b);
  const ranges = [];
  for (let index = 0; index < pages.length; ) {
    const first = pages[index];
    let last = first;
    while (pages[index + 1] === last + 1) last = pages[++index];
    ranges.push(first === last ? `${first}` : `${first}–${last}`);
    index += 1;
  }
  return `PDF ${pages.length === 1 ? "p." : "pp."} ${ranges.join(", ")}`;
}

const models = {
  power: ["models/product-tanker.glb", 90, "Power-driven vessel"],
  cargo: ["models/atlas-container-ship.glb", 110, "Cargo vessel"],
  fishing: ["models/fishing-trawler.glb", 28, "Vessel engaged in fishing"],
  sailing: ["models/sailing-yacht.glb", 15, "Sailing vessel"],
};

function point(time, east, north, heading) {
  return { time, east, north, heading };
}

function straight(east, north, heading, distance = 300) {
  const radians = (heading * Math.PI) / 180;
  return [
    point(0, east, north, heading),
    point(
      duration,
      Math.round((east + Math.sin(radians) * distance) * 100) / 100,
      Math.round((north + Math.cos(radians) * distance) * 100) / 100,
      heading,
    ),
  ];
}

function manoeuvre(east, north, headingAt, speedAt = () => 4) {
  const track = [point(0, east, north, headingAt(0))];
  for (let time = 2; time <= duration; time += 2) {
    const previous = track.at(-1);
    const midTime = time - 1;
    const heading = headingAt(midTime);
    const radians = (heading * Math.PI) / 180;
    const distance = speedAt(midTime) * 2;
    east = previous.east + Math.sin(radians) * distance;
    north = previous.north + Math.cos(radians) * distance;
    track.push(point(time, Math.round(east * 100) / 100, Math.round(north * 100) / 100, headingAt(time)));
  }
  return track;
}

function turn(from, to, start, end) {
  return (time) => {
    if (time <= start) return from;
    if (time >= end) return to;
    return from + ((to - from) * (time - start)) / (end - start);
  };
}

function vessel(id, name, color, modelKey, track, kindOverride) {
  const [model, length, kind] = models[modelKey];
  return { id, name, color, length, kind: kindOverride ?? kind, model, track };
}

const geometries = {
  approach: () => [
    vessel("own", "Own vessel", "#50d5c2", "power", straight(-80, -340, 0, 250)),
    vessel("target", "Target vessel", "#f4b76a", "cargo", straight(80, 340, 180, 250)),
  ],
  headon: () => [
    vessel("own", "Own vessel", "#50d5c2", "power", manoeuvre(0, -360, turn(0, 38, 34, 52), () => 6)),
    vessel("other", "Other vessel", "#f4b76a", "cargo", manoeuvre(0, 360, turn(180, 218, 34, 52), () => 6)),
  ],
  crossStarboard: () => [
    vessel("own", "Own vessel", "#50d5c2", "power", manoeuvre(0, -300, turn(0, 55, 20, 42), () => 4)),
    vessel("other", "Vessel to starboard", "#f4b76a", "cargo", manoeuvre(300, 0, () => 270, () => 4)),
  ],
  crossPort: () => [
    vessel("own", "Own vessel", "#50d5c2", "power", manoeuvre(0, -300, () => 0, () => 4)),
    vessel("other", "Vessel to port", "#f4b76a", "cargo", manoeuvre(-300, 0, turn(90, 145, 20, 42), () => 4)),
  ],
  overtakeStarboard: () => [
    vessel("overtaking", "Overtaking vessel", "#50d5c2", "power", manoeuvre(130, -390, () => 0, () => 8)),
    vessel("overtaken", "Vessel being overtaken", "#f4b76a", "cargo", manoeuvre(0, -120, () => 0, () => 3)),
  ],
  overtakePort: () => [
    vessel("overtaking", "Overtaking vessel", "#50d5c2", "power", manoeuvre(-130, -390, () => 0, () => 8)),
    vessel("overtaken", "Vessel being overtaken", "#f4b76a", "cargo", manoeuvre(0, -120, () => 0, () => 3)),
  ],
  sailOpposite: () => [
    vessel("port-tack", "Port-tack yacht", "#50d5c2", "sailing", manoeuvre(-180, -210, turn(35, 105, 28, 56), () => 3.2), "Sailing vessel — port tack"),
    vessel("starboard-tack", "Starboard-tack yacht", "#f4b76a", "sailing", manoeuvre(180, 20, () => 215, () => 3.2), "Sailing vessel — starboard tack"),
  ],
  sailSame: () => [
    vessel("windward", "Windward yacht", "#50d5c2", "sailing", manoeuvre(-120, -108, turn(30, 100, 28, 56), () => 3.2), "Sailing vessel — windward, port tack"),
    vessel("leeward", "Leeward yacht", "#f4b76a", "sailing", manoeuvre(0, -140, () => 0, () => 3.2), "Sailing vessel — leeward, port tack"),
  ],
  mixed: (target = "sailing") => [
    vessel("power", "Power-driven vessel", "#50d5c2", "power", manoeuvre(0, -300, turn(0, 55, 20, 42), () => 4)),
    vessel(
      "special",
      target === "fishing" ? "Fishing vessel" : target === "cargo" ? "Constrained vessel" : target === "nuc" ? "Vessel not under command" : target === "ram" ? "Restricted vessel" : "Sailing vessel",
      "#f4b76a",
      target === "nuc" || target === "ram" ? "power" : target,
      manoeuvre(300, 0, () => 270, () => 4),
      target === "fishing" ? "Vessel engaged in fishing" : target === "cargo" ? "Vessel constrained by her draught" : target === "nuc" ? "Vessel not under command" : target === "ram" ? "Vessel restricted in ability to manoeuvre" : "Sailing vessel",
    ),
  ],
  channel: () => [
    vessel("inbound", "Inbound vessel", "#50d5c2", "power", straight(80, -340, 0, 300)),
    vessel("outbound", "Outbound vessel", "#f4b76a", "cargo", straight(-80, 340, 180, 300)),
  ],
  tssJoin: () => [
    vessel("traffic", "Lane traffic", "#f4b76a", "cargo", straight(-320, 50, 90, 330)),
    vessel("joining", "Joining vessel", "#50d5c2", "power", straight(-250, -100, 70, 440)),
  ],
  tssCross: () => [
    vessel("traffic", "Lane traffic", "#f4b76a", "cargo", straight(-320, 50, 90, 300)),
    vessel("crossing", "Crossing vessel", "#50d5c2", "power", straight(80, -280, 0, 700)),
  ],
  restricted: () => [
    vessel("own", "Own vessel", "#50d5c2", "power", straight(-100, -320, 0, 220)),
    vessel("contact", "Radar contact", "#f4b76a", "cargo", straight(170, 260, 200, 210)),
  ],
};

const lessons = [
  ["scope-responsibility", "Scope and responsibility", "The Rules apply to vessels on the high seas and connected navigable waters, while responsibility still includes precautions required by ordinary seamanship and special circumstances.", [1, 2], ["Rule 1 establishes where the regulations apply.", "Rule 2 preserves responsibility for compliance, ordinary seamanship and special circumstances."], "approach"],
  ["definitions-in-use", "Definitions shape the encounter", "Terms such as vessel, power-driven, sailing, underway and making way determine which later duties fit the facts.", [3], ["Status follows the Rule 3 definitions, not casual hull labels.", "A vessel can be underway without making way through the water."], "mixed"],
  ["conduct-any-visibility", "Conduct in any condition of visibility", "Rules 4–10 form the conduct requirements that apply in any condition of visibility.", [4], ["Rule 4 introduces Section I.", "Look-out, safe speed and risk assessment remain relevant in clear and restricted visibility."], "approach"],
  ["vessels-in-sight", "When vessels are in sight", "The steering and sailing rules in Section II apply when vessels are in sight of one another.", [11], ["The vessels can be observed visually from one another.", "A radar-only encounter in fog is treated under Rule 19 instead."], "crossStarboard"],
  ["lookout-all-means", "Look-out by all available means", "Visual scanning, hearing and available instruments contribute to a continuing appraisal.", [5], ["Rule 5 applies at all times.", "The look-out supports a full appraisal of the situation and risk of collision."], "approach"],
  ["safe-speed-context", "Safe speed depends on the circumstances", "Traffic, manoeuvrability, visibility and environmental limits must be weighed together.", [6], ["Safe speed is contextual rather than a universal number.", "The vessel must retain scope for proper and effective action."], "approach"],
  ["risk-bearing", "Steady bearing as a warning", "A target that remains on nearly the same compass bearing while range closes is a classic collision-risk cue.", [7], ["Use all available means to determine risk.", "Scanty information is not a sound basis for an assumption."], "crossStarboard"],
  ["risk-large-vessel", "Risk can exist with bearing change", "A large vessel, tow or close-range target can create risk even when the bearing changes appreciably.", [7], ["Do not treat bearing change as a guarantee of safety.", "Assess the target’s size, range and geometry."], "approach"],
  ["early-substantial-action", "Action should be positive and apparent", "A clear alteration made in ample time is easier for the other vessel to detect than a succession of small changes.", [8], ["Action should accord with good seamanship.", "Monitor the result until finally past and clear."], "crossStarboard"],
  ["slowing-action", "Slowing as part of collision avoidance", "Reducing speed, stopping or reversing propulsion may be appropriate when the circumstances require it.", [8], ["The depicted speed change is illustrative.", "Rule 8 does not prescribe one stopping distance or timeline."], "approach", "slow"],
  ["head-on-powered", "Power-driven vessels meeting head-on", "When reciprocal or nearly reciprocal courses involve risk, each alters course to starboard.", [14], ["This lesson assumes both are power-driven and in sight.", "The geometry is illustrative; no universal trigger distance is implied."], "headon"],
  ["crossing-give-way", "Crossing vessel on the starboard side", "The vessel that has the other on her starboard side keeps out of the way and, if circumstances admit, avoids crossing ahead.", [15, 16], ["Both vessels are power-driven and in sight.", "Give-way action remains subject to the full circumstances."], "crossStarboard"],
  ["crossing-mirror", "Crossing encounter viewed from the stand-on vessel", "The mirrored view identifies why the vessel seeing the other to port is initially the stand-on vessel.", [15, 17], ["Both vessels are power-driven and in sight.", "Stand-on status still requires watchful monitoring."], "crossPort"],
  ["overtake-starboard", "Overtaking on the starboard side", "An overtaking vessel keeps out of the way until finally past and clear, whichever side it uses.", [13], ["The faster vessel approaches from more than 22.5° abaft the beam.", "Passing side does not transfer the overtaking duty."], "overtakeStarboard"],
  ["overtake-port", "Overtaking on the port side", "Passing on the other side leaves the overtaking vessel’s duty unchanged.", [13], ["The faster vessel is approaching from the overtaking sector.", "Clearance and timing are illustrative."], "overtakePort"],
  ["overtake-boundary", "The 22.5° abaft-the-beam boundary", "A target near the sector boundary demands careful classification; if in doubt, treat the vessel as overtaking.", [13], ["The 22.5° line defines the overtaking sector.", "The scene exaggerates lateral spacing so the boundary is readable."], "overtakeStarboard"],
  ["sailing-opposite-tacks", "Sailing vessels on opposite tacks", "With wind on different sides, the vessel with wind on the port side keeps out of the way.", [12], ["Both vessels are under sail and in sight.", "Wind is shown as an illustrative direction."], "sailOpposite", null, 315],
  ["sailing-same-tack", "Sailing vessels on the same tack", "With wind on the same side, the windward vessel keeps out of the way of the leeward vessel.", [12], ["Both vessels are under sail on the same tack.", "Relative windward and leeward positions are the teaching focus."], "sailSame", null, 300],
  ["sailing-tack-uncertain", "Uncertain tack of the windward vessel", "A port-tack vessel that cannot determine whether the windward vessel has wind on her port or starboard side keeps out of the way.", [12], ["Sails and lights may be difficult to interpret in practice.", "Uncertainty is part of the rule condition."], "sailOpposite", null, 315],
  ["stand-on-hold", "Stand-on stage: keep course and speed", "At the initial stage, the stand-on vessel maintains course and speed while monitoring the give-way vessel.", [17], ["Risk of collision exists and the vessels are in sight.", "The stage changes if the give-way vessel does not act."], "crossPort"],
  ["stand-on-may-act", "Stand-on stage: may take action", "When it becomes apparent that the give-way vessel is not taking appropriate action, the stand-on vessel may act by her manoeuvre alone.", [17], ["This is the intermediate Rule 17 stage.", "Any action must be assessed in the actual circumstances."], "crossPort"],
  ["stand-on-shall-act", "Stand-on stage: shall take best action", "When collision cannot be avoided by the give-way vessel’s action alone, the stand-on vessel takes the action that will best aid avoidance.", [17], ["This is the later compulsory stage.", "The scene does not prescribe a universal manoeuvre."], "crossPort"],
  ["power-vs-sailing", "Power-driven vessel and sailing vessel", "A power-driven vessel underway keeps out of the way of a sailing vessel, subject to the Rules’ stated exceptions.", [18], ["The sailing vessel is genuinely under sail.", "Rule 18 must be read with Rules 9, 10 and 13."], "mixed"],
  ["power-vs-fishing", "Power-driven vessel and fishing vessel", "Except where Rules 9, 10 and 13 otherwise require, a power-driven vessel underway shall keep out of the way of a vessel engaged in fishing.", [18], ["The fishing vessel’s gear restricts manoeuvrability.", "A vessel merely carrying fishing gear is not automatically engaged in fishing."], "mixedFishing"],
  ["power-vs-nuc", "Vessel not under command", "Except where Rules 9, 10 and 13 otherwise require, this power-driven vessel underway shall keep out of the way of the vessel not under command.", [18], ["The NUC vessel cannot manoeuvre as required by the Rules.", "Shapes and lights, not hull type, establish status."], "mixedNuc"],
  ["power-vs-ram", "Vessel restricted in ability to manoeuvre", "Other vessels keep out of the way of a RAM vessel so far as possible, with the hierarchy and exceptions considered together.", [18], ["The restriction arises from the nature of the vessel’s work.", "The depicted work area and spacing are illustrative."], "mixedRam"],
  ["constrained-by-draught", "Vessel constrained by her draught", "A vessel other than one not under command or restricted in ability to manoeuvre shall, if circumstances admit, avoid impeding the safe passage of a vessel constrained by her draught and exhibiting the Rule 28 signals.", [18], ["The constrained vessel is power-driven and severely restricted in her ability to deviate from her course by her draught relative to available depth and width.", "This status depends on the particular navigable water."], "mixedCargo"],
  ["channel-starboard", "Keep near the channel’s starboard limit", "A vessel proceeding along a narrow channel keeps as near to the outer limit on her starboard side as is safe and practicable.", [9], ["The waterway is treated as a narrow channel.", "The illustrated lane offset is not a rule-defined distance."], "channel", null, null, "channel"],
  ["channel-crossing", "Crossing a narrow channel", "A crossing vessel must not impede a vessel that can safely navigate only within the channel.", [9], ["The through vessel can safely navigate only within the channel.", "This schematic timing is illustrative and does not demonstrate that the shown crossing is non-impeding."], "crossStarboard", null, null, "channel"],
  ["channel-overtaking", "Overtaking in a narrow channel", "When overtaking can occur only if the vessel being overtaken cooperates, the prescribed sound-signal exchange communicates intention and agreement.", [9], ["The channel limits free manoeuvre.", "Agreement does not relieve the overtaking vessel of her Rule 13 duty."], "overtakePort", "channelSound", null, "channel"],
  ["channel-bend", "Approaching a bend", "Near a bend where vessels may be obscured, navigate with particular alertness, sound one prolonged blast and answer a heard bend signal with one prolonged blast.", [9, 34], ["The bend obstructs sight of approaching traffic.", "Rule 34(e) supplies the prolonged bend signal and reply."], "channel", "bendSound", null, "bend"],
  ["tss-joining", "Joining a traffic lane", "A vessel joining a lane does so at as small an angle to the general direction of traffic flow as practicable.", [10], ["The marked route is a traffic separation scheme.", "The joining angle is illustrative, not a numeric rule threshold."], "tssJoin", null, null, "tss"],
  ["tss-crossing", "Crossing a traffic lane", "When obliged to cross a traffic lane, a vessel crosses on a heading as nearly as practicable at right angles to the traffic flow.", [10], ["The vessel is crossing rather than joining the lane.", "The rule concerns heading, while current may change track over ground."], "tssCross", null, null, "tss"],
  ["restricted-radar-ahead", "Restricted visibility: radar contact forward", "A radar-only contact forward of the beam calls for early assessment and caution about alterations to port.", [19], ["The vessels are not in sight of one another.", "The contact is detected by radar in restricted visibility."], "restricted", "fog", null, "open", "restricted"],
  ["restricted-radar-abeam", "Restricted visibility: contact abeam or abaft", "For a radar-only contact abeam or abaft the beam, Rule 19 cautions against altering toward the vessel.", [19], ["The vessels are not in sight of one another.", "Relative position is established by systematic radar observation."], "overtakePort", "fog", null, "open", "restricted"],
  ["restricted-fog-signal", "Restricted visibility: fog signal ahead", "On hearing an apparently forward fog signal, reduce to the minimum speed at which course can be kept and, if necessary, take all way off while navigating with extreme caution.", [19], ["The signal is heard apparently forward of the beam.", "No universal distance or response time is implied."], "approach", "fogSignal", null, "open", "restricted"],
];

function makeScenario(definition) {
  const [id, title, summary, rules, conditions, geometryName, eventKind, windFrom, kind = "open", visibility = "clear"] = definition;
  const geometryKey = geometryName.startsWith("mixed") ? "mixed" : geometryName;
  let vessels = geometries[geometryKey](geometryName === "mixedFishing" ? "fishing" : geometryName === "mixedCargo" ? "cargo" : geometryName === "mixedNuc" ? "nuc" : geometryName === "mixedRam" ? "ram" : undefined);
  if (id === "stand-on-may-act" || id === "stand-on-shall-act") {
    const actionStart = id === "stand-on-may-act" ? 38 : 46;
    const actionEnd = id === "stand-on-may-act" ? 64 : 78;
    const actionHeading = id === "stand-on-may-act" ? 85 : 100;
    vessels = [
      vessel("own", "Stand-on vessel", "#50d5c2", "power", manoeuvre(0, -300, turn(0, actionHeading, actionStart, actionEnd), () => 4)),
      vessel("other", "Give-way vessel not taking action", "#f4b76a", "cargo", manoeuvre(-300, 0, () => 90, () => 4)),
    ];
    vessels[0].length = 60;
    vessels[1].length = 70;
  }
  if (id === "channel-crossing") {
    vessels = [
      vessel("crossing", "Crossing vessel waiting outside", "#50d5c2", "power", manoeuvre(-220, 0, () => 90, (time) => time < 58 ? 0 : 12)),
      vessel("through", "Channel-bound vessel", "#f4b76a", "cargo", manoeuvre(80, -340, () => 0, () => 6)),
    ];
  }
  if (id === "channel-bend") {
    vessels = [
      vessel("inbound", "Inbound vessel", "#50d5c2", "power", straight(80, -340, 0, 300)),
      vessel("outbound", "Outbound vessel", "#f4b76a", "cargo", straight(340, 80, 270, 300)),
    ];
  }
  if (id === "restricted-radar-ahead") {
    vessels = [
      vessel("own", "Own vessel", "#50d5c2", "power", manoeuvre(-80, -340, turn(0, 60, 14, 38), () => 4)),
      vessel("contact", "Radar contact", "#f4b76a", "cargo", manoeuvre(80, 340, () => 180, () => 4)),
    ];
  }
  if (id === "restricted-radar-abeam") {
    vessels = [
      vessel("own", "Own vessel", "#50d5c2", "power", manoeuvre(0, -250, turn(0, 50, 18, 40), () => 4)),
      vessel("contact", "Radar contact abeam to port", "#f4b76a", "cargo", manoeuvre(-180, -250, () => 0, () => 3)),
    ];
  }
  if (id === "restricted-fog-signal") {
    vessels = [
      vessel("own", "Own vessel", "#50d5c2", "power", manoeuvre(-80, -340, () => 0, (time) => time < 25 ? 4 : 1)),
      vessel("target", "Unseen vessel sounding fog signal", "#f4b76a", "cargo", manoeuvre(80, 340, () => 180, () => 3.3)),
    ];
  }
  if (eventKind === "slow") {
    vessels[0].track = [point(0, -80, -340, 0), point(35, -80, -200, 0), point(90, -80, -90, 0)];
  }
  const events = [
    { time: 4, duration: 8, type: "annotation", text: conditions[0] },
  ];
  if (eventKind === "bendSound") {
    events.push({ time: 18, duration: 5, type: "sound", pattern: [5], text: "One prolonged blast near the bend", vesselId: "inbound" });
    events.push({ time: 26, duration: 5, type: "sound", pattern: [5], text: "One prolonged blast in reply from beyond the bend", vesselId: "outbound" });
  }
  if (eventKind === "channelSound") events.push({ time: 20, duration: 15, type: "sound", pattern: [5, 1, 5, 1, 1, 1, 1], text: "Overtaking signal for passing on the other vessel’s port side: two prolonged followed by two short blasts", vesselId: "overtaking" });
  if (eventKind === "fogSignal") events.push({ time: 25, duration: 5, type: "sound", pattern: [5], text: "Prolonged fog signal heard forward", vesselId: "target" });
  if (eventKind === "fog") events.push({ time: 12, duration: 6, type: "annotation", text: "Radar contact: vessels are not in sight" });
  const pages = pagesForRules(rules);
  const outcomeBody = id === "scope-responsibility"
    ? "Use this scene as a reminder to assess the full circumstances and applicable duties."
    : "Continue to assess the other vessel and the effect of any action until the vessels are finally past and clear.";
  return {
    id,
    title,
    summary,
    status: "draft",
    duration,
    ruleIds: rules.map((rule) => `rule-${rule}`),
    conditions,
    environment: { kind, visibility, ...(windFrom == null ? {} : { windFrom }) },
    events,
    assumptions: [
      "Positions, timings, angles and separation are illustrative teaching choices, not rule-defined thresholds.",
      "Motion is simplified and does not model hydrodynamics, stopping distance, current or sea state.",
      "Vessel models and displayed lengths are scaled for legibility while preserving clearance between hulls.",
      "Apply the COLREGs to the full circumstances; this scene is not an unconditional manoeuvring prescription.",
    ],
    sources: [{ title: reference.source.title, pages, rule: rules.map((rule) => `Rule ${rule}`).join(", ") }],
    vessels,
    steps: [
      { time: 0, title: "Identify the conditions", body: `${conditions[0]} ${conditions[1] ?? "Assess the developing encounter."}` },
      { time: 30, title: "Apply the rule", body: summary },
      { time: 65, title: "Check the outcome", body: outcomeBody },
    ],
  };
}

const scenarios = lessons.map(makeScenario);
for (const scenario of scenarios) {
  await writeFile(path.join(out, `${scenario.id}.json`), `${JSON.stringify(scenario, null, 2)}\n`, "utf8");
}

const currentIndex = JSON.parse(await readFile(path.join(out, "index.json"), "utf8"));
const demos = currentIndex.filter((entry) => ["steady-tracks", "course-change"].includes(entry.id));
const educational = scenarios.map((scenario) => ({
  id: scenario.id,
  file: `${scenario.id}.json`,
  title: scenario.title,
  subtitle: `Rule${scenario.ruleIds.length > 1 ? "s" : ""} ${scenario.ruleIds.map((rule) => rule.slice(5)).join(", ")} · ${scenario.environment.kind}`,
  duration: scenario.duration,
  ruleIds: scenario.ruleIds,
}));
await writeFile(path.join(out, "index.json"), `${JSON.stringify([...demos, ...educational], null, 2)}\n`, "utf8");

console.log(`Generated ${scenarios.length} educational encounters; preserved ${demos.length} technical demos.`);
const csvCell=(value)=>`"${String(value).replaceAll('"','""')}"`;
const sourceRows=scenarios.map(s=>[s.id,reference.source.file,'',s.sources[0].pages,'','source-linked',s.ruleIds.join(' ')].map(csvCell).join(','));
await writeFile(path.join(root,'content','index.csv'),[
 'scenario_id,source_file,printed_pages,pdf_pages,figure,status,notes',
 ...demos.map(d=>`${d.id},,,,,technical-demo,Synthetic player demonstration`),
 ...sourceRows,
].join('\n')+'\n','utf8');
