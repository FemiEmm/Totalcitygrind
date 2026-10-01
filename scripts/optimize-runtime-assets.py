"""Downscale runtime PNGs to their largest useful in-game dimensions.

The operation is idempotent and only replaces a file when its dimensions
exceed its target.
"""

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]

TARGETS = {
    "src/assets/ground/grass-tile.png": (512, 512),
    "src/assets/buildings/supermarket-roof.png": (768, 768),
    "src/assets/buildings/bus-terminal.png": (960, 320),
    "src/assets/buildings/community-clinic.png": (768, 384),
    "src/assets/world/bus-stop-canopy.png": (512, 342),
    "src/assets/ui/phone-launcher.png": (384, 384),
    "src/assets/population/brt.png": (384, 768),
    "src/assets/population/cargo-truck.png": (384, 768),
    "src/assets/population/petrol-truck-cartoon.png": (384, 768),
    "src/assets/population/delivery-van.png": (256, 512),
    "src/assets/population/private-blue-sedan.png": (256, 512),
    "src/assets/population/private-red-hatch.png": (256, 512),
    "src/assets/population/private-white-suv.png": (256, 512),
    "src/assets/population/private-purple-coupe.png": (256, 512),
    "src/assets/population/private-silver-estate.png": (256, 512),
    "src/assets/population/taxi.png": (256, 512),
    "src/assets/vehicles/tow-truck.png": (384, 768),
    "src/assets/vehicles/highway/cyan-sedan.png": (256, 512),
    "src/assets/vehicles/purchasable/sprites/eko-compact.png": (384, 384),
    "src/assets/vehicles/purchasable/sprites/mainland-hatch.png": (384, 384),
    "src/assets/vehicles/purchasable/sprites/lagoon-sedan.png": (384, 384),
    "src/assets/vehicles/purchasable/sprites/island-cruiser.png": (384, 384),
    "src/assets/vehicles/purchasable/sprites/victoria-executive.png": (384, 384),
    "src/assets/vehicles/purchasable/showroom/eko-compact.png": (960, 540),
    "src/assets/vehicles/purchasable/showroom/mainland-hatch.png": (960, 540),
    "src/assets/vehicles/purchasable/showroom/lagoon-sedan.png": (960, 540),
    "src/assets/vehicles/purchasable/showroom/island-cruiser.png": (960, 540),
    "src/assets/vehicles/purchasable/showroom/victoria-executive.png": (960, 540),
}


def optimize(relative_path: str, target: tuple[int, int]) -> None:
    path = ROOT / relative_path
    if not path.exists():
        return

    with Image.open(path) as source:
        if source.width <= target[0] and source.height <= target[1]:
            return

        image = source.convert("RGBA")
        image.thumbnail(target, Image.Resampling.LANCZOS)
        image.save(path, "PNG", optimize=True, compress_level=9)
        print(
            f"{relative_path}: "
            f"{source.width}x{source.height} -> {image.width}x{image.height}"
        )


for asset_path, maximum_size in TARGETS.items():
    optimize(asset_path, maximum_size)
