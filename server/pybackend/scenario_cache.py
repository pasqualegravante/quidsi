from collections import OrderedDict
import time
from typing import Dict, Optional, List, Tuple
import networkx as nx

class ScenarioCache:
    def __init__(
        self,
        max_global: int = 200,
        max_per_user: int = 8
    ):
        self.max_global = max_global
        self.max_per_user = max_per_user
        self.cache: OrderedDict[str, dict] = OrderedDict()          # key = "user_id:_id"
        self.user_counts: Dict[str, int] = {}                       # user_id → conteggio

    def _key(self, user_id: str, _id: str) -> str:
        return f"{user_id}:{_id}"

    def _get_user_scenarios(self, user_id: str) -> List[Tuple[str, dict]]:
        """Ritorna lista di (key, state) per quell'utente, ordinata per last_access crescente (più vecchi prima)"""
        user_items = [
            (k, v) for k, v in self.cache.items()
            if k.startswith(f"{user_id}:")
        ]
        # Ordina per last_access ASC → i più vecchi prima
        user_items.sort(key=lambda x: x[1]["last_access"])
        return user_items

    def _evict_half_for_user(self, user_id: str):
        """Elimina il 50% degli scenari più vecchi per questo utente"""
        user_scenarios = self._get_user_scenarios(user_id)
        if not user_scenarios:
            return

        count = len(user_scenarios)
        if count <= self.max_per_user:
            return  # non serve espellere

        to_remove_count = count // 2  # 50% arrotondato per difetto
        if to_remove_count < 1:
            to_remove_count = 1  # almeno uno

        to_remove_keys = [key for key, _ in user_scenarios[:to_remove_count]]

        for key in to_remove_keys:
            del self.cache[key]

        # Aggiorna contatore
        self.user_counts[user_id] = max(0, count - to_remove_count)

        print(f"[Cache] Evicted {to_remove_count} old scenarios for user {user_id}. Remaining: {self.user_counts[user_id]}")

    def get(self, user_id: str, _id: str) -> Optional[dict]:
        key = self._key(user_id, _id)
        if key not in self.cache:
            return None
        self.cache[key]["last_access"]=time.time()
        self.cache.move_to_end(key)  # LRU touch
        return self.cache[key]

    def put(
        self,
        user_id: str,
        _id: str,
        graph: nx.Graph = None,
        closed_segments: list = [],
        alfa: float = 0.5,
        manual_weights: dict = {}
    ) -> bool:
        key = self._key(user_id, _id)
        state = {
                "graph": graph,
                "closed_segments": list(closed_segments) if closed_segments else [],
                "alfa": alfa or 0.5,
                "manual_weights": dict(manual_weights) if manual_weights else [],
                "last_access": time.time(),
                "user_id": user_id,
                "_id": _id
        }
        # Se già esiste → aggiorna senza controlli
        if key in self.cache:
            self.cache[key] = state
            self.cache.move_to_end(key)
            return True

        # Controllo limite per utente
        current_count = self.user_counts.get(user_id, 0)
        if current_count >= self.max_per_user:
            # Elimina il 50% più vecchi
            self._evict_half_for_user(user_id)
            # Ricalcola dopo espulsione
            current_count = self.user_counts.get(user_id, 0)

        # Controllo globale (dopo eventuale pulizia utente)
        if len(self.cache) >= self.max_global:
            # LRU globale: rimuove il meno recente overall
            old_key, old_state = self.cache.popitem(last=False)
            old_user_id = old_state["user_id"]
            self.user_counts[old_user_id] = max(0, self.user_counts.get(old_user_id, 0) - 1)

        self.cache[key] = state
        self.cache.move_to_end(key)

        self.user_counts[user_id] = self.user_counts.get(user_id, 0) + 1

        return True

    def invalidate(self, user_id: str, _id: str) -> bool:
        key = self._key(user_id, _id)
        if key in self.cache:
            del self.cache[key]
            self.user_counts[user_id] = max(0, self.user_counts.get(user_id, 0) - 1)
            return True
        return False

    def update(self, user_id: str, _id: str, stateUpdate: Dict[str, any]) -> bool:
        state = self.get(user_id, _id)
        if state:
            state.update(stateUpdate)
            return True
        return False
    
    def stats(self) -> dict:
        return {
            "total_cached": len(self.cache),
            "users": len(self.user_counts),
            "per_user": {user_id: cnt for user_id, cnt in self.user_counts.items() if cnt > 0}
        }
    
    def has_capacity(self, user_id: str) -> bool:
        user_cap = self.max_per_user - self.user_counts.get(user_id, 0)
        all_cap = self.max_global - len(self.cache)

        return user_cap and all_cap