from homeassistant.core import HomeAssistant
from homeassistant.helpers.storage import Store

from .const import DOMAIN, EVENT_CONFIG_UPDATED

DEFAULT = {"roles": {}, "scenes": {}, "favorites": {}, "remotes": {}, "hardware": {}}


class LightwickStore:
    """App-owned config. Everything else lives in HA registries."""

    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass
        self._store: Store[dict] = Store(hass, 1, DOMAIN)
        self.data: dict = {k: dict(v) for k, v in DEFAULT.items()}

    async def load(self) -> None:
        if data := await self._store.async_load():
            self.data = {**self.data, **data}

    async def save(self) -> None:
        await self._store.async_save(self.data)
        self.hass.bus.async_fire(EVENT_CONFIG_UPDATED)
