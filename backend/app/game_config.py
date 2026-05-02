# Re-export shim. The actual config now lives split across app/data/ for
# clarity (moves, items, monsters, hero defaults). Existing call sites can
# keep importing from app.game_config until they migrate to the new paths.
from app.data.moves import MOVES
from app.data.items import ITEMS, POTION_PRICES
from app.data.monsters import MONSTERS
from app.data.hero import HERO_DEFAULTS, HERO_CLASSES

__all__ = ["MOVES", "ITEMS", "POTION_PRICES", "MONSTERS", "HERO_DEFAULTS", "HERO_CLASSES"]
