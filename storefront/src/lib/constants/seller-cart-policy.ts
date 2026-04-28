/** Policy carrello ufficiale Tramelle (tutti i produttori). */
export const TRAMELLE_MIN_ORDER_EUR = 35;
export const TRAMELLE_FREE_SHIP_IT_EUR = 65;
export const TRAMELLE_FREE_SHIP_EU_EUR = 95;

/** Sotto la soglia gratuita: costi fissi mostrati in carrello (Italia vs resto banda “Europa”). */
export const TRAMELLE_SHIP_FLAT_IT_EUR = 6.5;
export const TRAMELLE_SHIP_FLAT_EU_EUR = 12.5;

/** 35,00 € in centesimi (confronti con sottototali in minor units). */
export const TRAMELLE_MIN_ORDER_CENTS = Math.round(TRAMELLE_MIN_ORDER_EUR * 100);
