export class GetBookmarksQuery {
  constructor(
    public readonly page: number,
    public readonly limit: number,
  ) {}
}
