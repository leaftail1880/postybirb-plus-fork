import { Injectable, Logger, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { TagConverterRepositoryToken, TagConverterRepository } from './tag-converter.repository';
import { EventsGateway } from 'src/server/events/events.gateway';
import TagConverterEntity from './models/tag-converter.entity';
import { Events } from 'postybirb-commons';

@Injectable()
export class TagConverterService {
  private readonly logger = new Logger(TagConverterService.name);

  constructor(
    @Inject(TagConverterRepositoryToken)
    private readonly repository: TagConverterRepository,
    private readonly eventEmitter: EventsGateway,
  ) {}

  async get(id: string) {
    const entity = await this.repository.findOne(id);
    if (!entity) {
      throw new NotFoundException(`Tag Converter ${id} could not be found`);
    }
    return entity;
  }

  getAll() {
    return this.repository.find();
  }

  async getTagConvertersForWebsite(website: string) {
    const converters = await this.getAll();
    return converters.filter((converter) => converter.hasConversion(website));
  }

  async create(customShortcutDto: TagConverterEntity) {
    this.logger.log(customShortcutDto, 'Tag Converter Shortcut');
    if (!(await this.isUnique(customShortcutDto.tag))) {
      throw new BadRequestException('Tag must be unique');
    }
    customShortcutDto.conversions = customShortcutDto.conversions || {};
    const dt = await this.repository.save(customShortcutDto);
    this.eventEmitter.emit(Events.TagConverterEvent.CREATED, dt);
    return dt;
  }

  remove(id: string) {
    this.logger.log(id, 'Delete Custom Shortcut');
    this.eventEmitter.emit(Events.TagConverterEvent.REMOVED, id);
    return this.repository.remove(id);
  }

  async update(update: TagConverterEntity) {
    this.logger.log(update._id, 'Update Tag Converter');
    const exists = await this.get(update._id);
    exists.tag = update.tag;
    exists.conversions = update.conversions;
    await this.repository.update(exists);

    this.eventEmitter.emit(Events.TagConverterEvent.UPDATED, exists);
  }

  async isUnique(tag: string): Promise<boolean> {
    const alreadyInUse = await this.repository.find({ tag });
    return !!alreadyInUse;
  }
}
