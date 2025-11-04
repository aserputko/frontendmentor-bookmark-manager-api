import { UpdateBookmarkDto } from '../dto/update-bookmark.dto';

export class UpdateBookmarkCommand {
  constructor(
    public readonly id: string,
    public readonly dto: UpdateBookmarkDto,
  ) {}
}

