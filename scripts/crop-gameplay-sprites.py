from pathlib import Path
from shutil import copy2

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
BACKUP_ROOT = ROOT / ".asset-backups" / "pre-crop"

# These rectangles are the crop regions the renderer previously applied on
# every draw. Baking them into the source PNGs keeps the exact same artwork
# while avoiding decoded transparent pixels at runtime.
CROPS = {
    "src/assets/population/private-blue-sedan.png": (322, 49, 608, 1156),
    "src/assets/population/private-red-hatch.png": (310, 40, 633, 1180),
    "src/assets/population/private-white-suv.png": (330, 105, 585, 1060),
    "src/assets/population/private-purple-coupe.png": (351, 114, 549, 1021),
    "src/assets/population/private-silver-estate.png": (363, 74, 528, 1106),
    "src/assets/population/taxi.png": (362, 78, 529, 1088),
    "src/assets/population/brt.png": (312, 136, 399, 1265),
    "src/assets/population/petrol-truck-cartoon.png": (287, 51, 309, 1673),
    "src/assets/population/delivery-van.png": (340, 84, 576, 1101),
}


def main():
    for relative_path, (left, top, width, height) in CROPS.items():
        source = ROOT / relative_path
        backup = BACKUP_ROOT / relative_path

        with Image.open(source) as image:
            if image.size == (width, height):
                print(f"already cropped: {relative_path}")
                continue

            if image.width < left + width or image.height < top + height:
                raise ValueError(
                    f"{relative_path} is {image.size}, too small for "
                    f"{(left, top, width, height)}"
                )

            backup.parent.mkdir(parents=True, exist_ok=True)
            if not backup.exists():
                copy2(source, backup)

            cropped = image.crop(
                (left, top, left + width, top + height)
            )
            cropped.save(source, optimize=True)
            print(
                f"cropped: {relative_path} "
                f"{image.size} -> {cropped.size}"
            )


if __name__ == "__main__":
    main()
