export class GetTagsQuery {
  constructor(
    public readonly page: number,
    public readonly limit: number,
    public readonly archived?: boolean,
  ) {}
}

