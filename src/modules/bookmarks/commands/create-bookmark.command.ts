import { CreateBookmarkDto } from '../dto/create-bookmark.dto';

export class CreateBookmarkCommand {
  constructor(public readonly dto: CreateBookmarkDto) {}
}
