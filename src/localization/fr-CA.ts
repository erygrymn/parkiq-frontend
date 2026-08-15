import type { CopyKey } from './en';

// fr-FR üstüne Québec katmanı: 'parking' → 'stationnement', 'garer' → 'stationner', 'week-end' → 'fin de semaine'.
export const frCA: Partial<Record<CopyKey, string>> = {
  onbTitle1: 'STATIONNEZ',
  onbBody1: 'Un appui suffit pour marquer où vous avez laissé la voiture. Niveau, photo et note restent facultatifs — à remplir seulement quand le stationnement est compliqué.',
  iParked: 'Je me stationne',
  filterCovered: 'Intérieur',
  laParked: 'STATIONNÉE',
  wParkTitle: 'Stationner',
  poiParking: 'Stationnement',
  parkedStamp: 'STATIONNÉE.',
  parkedAt: 'Stationnée à {time}',
  parkedDurationStamp: 'STATIONNÉE {duration}.',
  stillParked: 'Toujours stationné à {place} ?',
  osmAttribution: 'Données de stationnement © les contributeurs OpenStreetMap',
  scheduleWeekend: 'Tarif de fin de semaine appliqué',
  parkedWord: 'STATIONNÉE',
  notParkedYet: 'Pas stationné ici ? Supprimez ce stationnement',
  simpleReminder: 'Vous êtes stationné depuis {duration}.',
  proFeatureFilter: 'Filtrez les stationnements par borne, intérieur et distance',
  autoParkedAsk: 'Vous venez de vous stationner ? Touchez pour lancer le compteur ici.',
  goProUpsell: 'Scannez les panneaux, retrouvez la voiture, filtrez les stationnements',
  purchaseDoneBody: 'Scan des panneaux, boussole et guidage AR, détection auto et filtres de stationnement sont actifs.',
  unitsImperial: 'Pieds et milles',
  poiError: 'Impossible de charger les stationnements à proximité — vérifiez votre connexion',
  stillParkedShort: 'Toujours stationné ? Ce stationnement a commencé hier.',
};
