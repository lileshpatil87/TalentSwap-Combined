/**
 * Generic sort direction, used by `<Resource>QueryDto` sort params across
 * modules (Architecture Foundation §9.5). Business-specific sortable
 * fields (e.g. `reputationScore`) are declared per-module, not here.
 */
export enum SortDirection {
  ASC = 'asc',
  DESC = 'desc',
}
