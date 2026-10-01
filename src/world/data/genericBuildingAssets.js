import marketKioskUrl from "../../assets/buildings/generic/market-kiosk.png";
import marketRustyShopUrl from "../../assets/buildings/generic/market-rusty-shop.png";
import marketShedUrl from "../../assets/buildings/generic/market-shed.png";
import nightlifeRoofOneUrl from "../../assets/buildings/generic/nightlife-roof-1x1.png";
import nightlifeRoofTwoUrl from "../../assets/buildings/generic/nightlife-roof-2x2.png";
import residentialDoubleHouseUrl from "../../assets/buildings/generic/residential-double-house-2x2.png";
import residentialHouseUrl from "../../assets/buildings/generic/residential-house-1x1.png";
import wealthyModernOneUrl from "../../assets/buildings/generic/wealthy-modern-01.png";
import wealthyModernTwoUrl from "../../assets/buildings/generic/wealthy-modern-02.png";
import wealthyModernThreeUrl from "../../assets/buildings/generic/wealthy-modern-03.png";
import wealthyModernFourUrl from "../../assets/buildings/generic/wealthy-modern-04.png";
import wealthyModernFiveUrl from "../../assets/buildings/generic/wealthy-modern-05.png";
import workSkyscraperOneUrl from "../../assets/buildings/generic/work-skyscraper-1x1.png";
import workSkyscraperTwoUrl from "../../assets/buildings/generic/work-skyscraper-2x2.png";
import {
  DISTRICT_WIDTH,
  GRID_SIZE,
} from "./mapConstants.js";

const MARKET_ASSETS = Object.freeze([
  marketShedUrl,
  marketKioskUrl,
  marketRustyShopUrl,
]);

const WEALTHY_ASSETS = Object.freeze([
  wealthyModernOneUrl,
  wealthyModernTwoUrl,
  wealthyModernThreeUrl,
  wealthyModernFourUrl,
  wealthyModernFiveUrl,
]);

export const GENERIC_BUILDING_ASSET_URLS = Object.freeze([
  residentialHouseUrl,
  residentialDoubleHouseUrl,
  ...WEALTHY_ASSETS,
  ...MARKET_ASSETS,
  nightlifeRoofOneUrl,
  nightlifeRoofTwoUrl,
  workSkyscraperOneUrl,
  workSkyscraperTwoUrl,
]);

function hashIdentifier(identifier) {
  let hash = 2166136261;

  for (const character of identifier) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

export function getGenericBuildingVisual(building) {
  const hash = hashIdentifier(building.id);
  const isTwoByTwo =
    building.width === GRID_SIZE * 2 &&
    building.height === GRID_SIZE * 2;
  let spriteUrl = residentialHouseUrl;

  if (building.districtId === "starting-residential") {
    spriteUrl = isTwoByTwo
      ? residentialDoubleHouseUrl
      : residentialHouseUrl;
  } else if (building.districtId === "wealthy-residential") {
    spriteUrl = WEALTHY_ASSETS[hash % WEALTHY_ASSETS.length];
  } else if (building.districtId === "nightlife") {
    spriteUrl = isTwoByTwo
      ? nightlifeRoofTwoUrl
      : nightlifeRoofOneUrl;
  } else if (building.districtId === "work-hub") {
    const localX = building.x - DISTRICT_WIDTH;
    const localY = building.y;
    const isMarketNeighbourhood =
      !isTwoByTwo &&
      localX >= GRID_SIZE * 11 &&
      localX < GRID_SIZE * 22 &&
      localY < GRID_SIZE * 12;

    if (isMarketNeighbourhood) {
      spriteUrl = MARKET_ASSETS[hash % MARKET_ASSETS.length];
    } else {
      spriteUrl = isTwoByTwo
        ? workSkyscraperTwoUrl
        : workSkyscraperOneUrl;
    }
  }

  return {
    spriteUrl,
    spriteRotationQuarterTurns: hash % 4,
  };
}
