"""Render the preserved PDF as lazy-loaded, faithful source page previews."""
from pathlib import Path
import pypdfium2 as pdfium

root = Path(__file__).resolve().parents[1]
document = pdfium.PdfDocument(root / 'public/content/colreg-source.pdf')
output = root / 'public/content/pages'
output.mkdir(exist_ok=True)
for index in range(len(document)):
    page = document[index]
    image = page.render(scale=1.4).to_pil().convert('RGB')
    image.save(output / f'page-{index+1}.webp', quality=88)
    page.close()
document.close()
print(f'Rendered {index+1} source pages.')
