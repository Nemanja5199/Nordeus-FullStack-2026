# Re-export shim. Config lives in app/data/; this keeps legacy import paths working.
from app.data.moves import MOVES
from app.data.items import ITEMS, POTION_PRICES
from app.data.monsters import MONSTERS
from app.data.hero import HERO_CLASSES
from app.data.upgrades import UPGRADE_DEFS

__all__ = ["MOVES", "ITEMS", "POTION_PRICES", "MONSTERS", "HERO_CLASSES", "UPGRADE_DEFS"]
