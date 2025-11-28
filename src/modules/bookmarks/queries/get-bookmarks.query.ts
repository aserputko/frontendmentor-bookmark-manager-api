export type BookmarkSortBy = 'recently-added' | 'recently-visited' | 'most-visited';

export const BOOKMARK_SORT_BY_OPTIONS: BookmarkSortBy[] = [
  'recently-added',
  'recently-visited',
  'most-visited',
];

export class GetBookmarksQuery {
  constructor(
    public readonly page: number,
    public readonly limit: number,
    public readonly search?: string,
    public readonly archived?: boolean,
    public readonly sortBy?: BookmarkSortBy,
  ) {}
}
