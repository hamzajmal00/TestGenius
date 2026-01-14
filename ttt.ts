import VisionException from '@app/core/common/exceptions/vision.exception';
import { PageMetaDto } from '@app/core/common/paginate/dtos/page-meta.dto';
import { Order } from '@app/core/common/paginate/dtos/page-options.dto';
import { ApplySearchAndOrderService } from '@app/core/common/services/apply-search-and-order.service';
import { EntityType } from '@app/core/common/types/entity.type';
import { AddSearchTermToQueryBuilderFunction, AddSortConditionToQueryBuilderFunction } from '@app/core/common/types/listing.type';
import { AppConfigType } from '@app/core/config/app.config';
import { AuthenticationConfigType } from '@app/core/config/authentication.config';
import { NotificationConfigType } from '@app/core/config/notification.config';
import { RoleConfigType } from '@app/core/config/role.config';
import { INITIAL_ORGANISATION_ID } from '@app/core/database/seed/organisation.seed';
import { AssetStatus } from '@app/core/modules/asset/types/asset-status.type';
import { AssignUserType } from '@app/core/modules/assign-tool/dtos/assign-user-type.dto';
import { AuthorizationService } from '@app/core/modules/authorization/authorization.service';
import { Role as RoleEntity } from '@app/core/modules/authorization/entities/role.entity';
import { Role, RoleBulkUpload } from '@app/core/modules/authorization/role.enum';
import { ScanStatus } from '@app/core/modules/document/types/scan-status.type';
import { InsurancePolicyAssingDto } from '@app/core/modules/insurer/dtos/insurance-policy-assign.dto';
import { BrokerPack } from '@app/core/modules/insurer/entities/broker-pack.entity';
import { InsurancePolicy } from '@app/core/modules/insurer/entities/insurance-policy.entity';
import { InsurerEngagement } from '@app/core/modules/insurer/entities/insurer-engagement.entity';
import { InsurancePolicyStatus } from '@app/core/modules/insurer/types/insurance-policy-status.type';
import { InsurerEngagementStatus } from '@app/core/modules/insurer/types/insurer-eng-status.type';
import { NotificationService } from '@app/core/modules/notification/notification.service';
import { NotificationType } from '@app/core/modules/notification/types/notification.type';
import { Organisation } from '@app/core/modules/organisation/entities/organisation.entity';
import { PartnerOrganisation } from '@app/core/modules/partner-organisation/entities/partner-organisation.entity';
import { UserPartnerOrganisation } from '@app/core/modules/partner-organisation/entities/user-partner-organisation.entity';
import { PartnerOrganisationType } from '@app/core/modules/partner-organisation/types/partner-organisation.type';
import { UserOrganisationStatus } from '@app/core/modules/user-organisation/user-organisation-status.type';
import { UserOrganisation } from '@app/core/modules/user-organisation/user-organisation.entity';
import { CreatePartnerOrgUserDto } from '@app/core/modules/user/dtos/create-partner-org-user.dto';
import { CurrentOrganisationInvitationDto } from '@app/core/modules/user/dtos/current-organisation-invitation.dto';
import {
  FirstStepsDto,
  brokerFirstStepsDefaultValues,
  insurerFirstStepsDefaultValues,
  macDelegateFirstStepsDefaultValues,
  macFirstStepsDefaultValues,
  pacFirstStepsDefaultValues,
  sacFirstStepsDefaultValues,
} from '@app/core/modules/user/dtos/first-steps.dto';
import { PartnerUserOptionsDto } from '@app/core/modules/user/dtos/partner-user.dto';
import { RoleCountDto } from '@app/core/modules/user/dtos/role-count.dto';
import UserMetaData from '@app/core/modules/user/dtos/user-meta.dto';
import { UserWithRelationsDto } from '@app/core/modules/user/dtos/user-with-relations.dto';
import { buildAllAssignFindCondition } from '@app/core/modules/user/helpers/user-assign.helper';
import UserEventType from '@app/core/modules/user/types/user-event.type';
import { Affiliation, LoaType, PreferredContactMethod } from '@app/core/modules/user/types/user-field-type';
import UserListScope from '@app/core/modules/user/types/user-list-scope.types';
import { CurrentUser } from '@app/core/modules/user/types/user-request.type';
import { UserEventService } from '@app/core/modules/user/user-event.service';
import { rolesCanMap } from '@app/core/modules/user/user-role-filters';
import userPermissions from '@app/core/modules/user/user.permissions';
import { Logger } from '@app/shared/logger/type/logger.type';
import Messages from '@app/shared/messages/message-patterns';
import { PdfExportRequest, PdfExportResponse } from '@app/shared/messages/pdf-export';
import { URLService } from '@app/shared/url.service';
import { formatAddress, toTitleCase } from '@app/shared/util/helpers';
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxy } from '@nestjs/microservices';
import { hash } from 'bcrypt';
import * as crypto from 'crypto';
import { isMatch, pick } from 'lodash';
import { firstValueFrom, timeout } from 'rxjs';
import { Brackets, DeepPartial, FindManyOptions, ILike, In, IsNull, LessThan, MoreThan, QueryRunner, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Asset } from '../asset/entities/asset.entity';
import { CreateAssignToolDto } from '../assign-tool/dtos/create-assign-tool.dto';
import { RoleService } from '../authorization/role.service';
import { DocumentService } from '../document/document.service';
import { Document } from '../document/entities/document.entity';
import { DocumentType } from '../document/types/document-type.type';
import { UserOrganisationService } from '../user-organisation/user-organisation.service';
import { BulkImportUserDto, PartnerBulkImportUserDto } from './dtos/bulk-import-user.dto';
import { ChangeUserPasswordDto } from './dtos/change-user-password.dto';
import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import { UserAssetsDto } from './dtos/user-asset.dto';
import { UserMemberOptionsDto, UserOptionsDto } from './dtos/user-options.dto';
import { UserRelationOptionsDto } from './dtos/user-relation-options.dto';
import { UserCompleteDto, UserDto } from './dtos/user.dto';
import { UserAsset } from './entities/user-asset.entity';
import { UserToken } from './entities/user-token.entity';
import { User } from './entities/user.entity';
import { UserStatusType } from './types/user-status.type';
import { UserTokenType } from './types/user-token.type';

type CompleteActivationDto = { password: string; token: string };
type TransactionDtos =
  | PartnerBulkImportUserDto
  | CreateUserDto
  | UpdateUserDto
  | ChangeUserPasswordDto
  | CompleteActivationDto
  | CreatePartnerOrgUserDto
  | null;

type ActivateUserDto = {
  currentUser: CurrentUser;
  userIds: string[];
  assetIds: string[];
  entityType: EntityType;
  entityId: string;
  expiresAt: Date;
  userType: AssignUserType;
  organisationId: string;
};

@Injectable()
export class UserService extends ApplySearchAndOrderService<User> {
  private authenticationConfig: AuthenticationConfigType;
  private notificationConfig: NotificationConfigType;
  private appConfig: AppConfigType;
  private roleConfig: RoleConfigType;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly config: ConfigService,
    @Inject(LoggerKey) protected logger: Logger,
    @InjectRepository(UserToken)
    private readonly userTokenRepository: Repository<UserToken>,
    @InjectRepository(UserAsset)
    private readonly userAssetRepository: Repository<UserAsset>,
    @InjectRepository(Organisation)
    private readonly organisationRepository: Repository<Organisation>,
    @InjectRepository(UserOrganisation)
    private readonly userOrganisationRepository: Repository<UserOrganisation>,
    private readonly configService: ConfigService,
    private readonly notificationService: NotificationService,
    private readonly roleService: RoleService,
    private readonly userOrganisationService: UserOrganisationService,
    private readonly documentService: DocumentService,
    private readonly userEventService: UserEventService,
    @Inject('PDF_EXPORTER') private pdfExporter: ClientProxy,
    private urlService: URLService,
    private authorizationService: AuthorizationService,
  ) {
    super();
    this.authenticationConfig = this.configService.get<AuthenticationConfigType>('authentication');
    this.notificationConfig = this.configService.get<NotificationConfigType>('notification');
    this.appConfig = this.configService.get<AppConfigType>('app');
    this.roleConfig = this.configService.get<RoleConfigType>('role');
  }

  getRepository(): Repository<User> {
    return this.userRepository;
  }

  findAll(options?: FindManyOptions<User>): Promise<User[]> {
    return this.userRepository.find(options);
  }

  findAllByIds(ids: string[]) {
    return this.userRepository.find({
      where: { id: In(ids), userOrganisations: { userStatus: UserOrganisationStatus.ACTIVE } },
      relations: { userOrganisations: { role: true }, userPartnerOrganisations: { partnerOrganisation: true } },
    });
  }
  findMember(id: string) {
    return this.userRepository.createQueryBuilder('user').where('user.id = :id', { id }).getOne();
  }

  getAssignedRoleToAsset(assetId: string, roles: Role[], organisationId: string) {
    return this.userRepository.find({
      relations: { userAssets: true, userOrganisations: { role: true } },
      where: { userAssets: { assetId, user: { userOrganisations: { organisationId, role: { name: In(roles) } } } } },
    });
  }

  async updateFirstStepsState(userId: string, firstSteps: FirstStepsDto, organisationId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId }, relations: { userOrganisations: true } });
    if (!user) throw new NotFoundException('User not found');
    const firstStepKey = Object.keys(firstSteps)[0];
    const userOrganisation = user.userOrganisations.find((uo) => uo.organisationId === organisationId);
    userOrganisation.firstStepsState[firstStepKey].completed = new Date();
    return this.userOrganisationService.save({ ...userOrganisation });
  }

  async findOneWithPartnerOrganisation(userId: string): Promise<User> {
    return this.userRepository
      .createQueryBuilder('user')
      .innerJoinAndSelect('user.userPartnerOrganisations', 'upo')
      .where('user.id = :userId', { userId })
      .getOne();
  }

  async findOneWithOrganisations(userId: string): Promise<User> {
    return this.userRepository
      .createQueryBuilder('user')
      .innerJoin('user.userOrganisations', 'uo', 'uo.userStatus = :uostatus', { uostatus: UserOrganisationStatus.ACTIVE })
      .leftJoinAndSelect('uo.role', 'role')
      .leftJoinAndSelect('uo.organisation', 'org')
      .leftJoinAndMapOne('user.avatar', Document, 'avatar', 'avatar.entityId = :userId AND avatar.entityType = :entityType AND avatar.type = :type', {
        entityType: EntityType.USER,
        type: DocumentType.IMAGE,
        userId,
      })
      .where('user.id = :userId', { userId })
      .andWhere('user.status IN (:...status)', { status: [UserStatusType.ACTIVE, UserStatusType.SUSPENDED] })
      .getOne();
  }

  async findOneForMemberDetailPage(
    id: string,
    userRelationOptionsDto?: UserRelationOptionsDto & { organisationId?: string; includeLastInvite?: boolean; partnerOrganisationId?: string },
  ) {
    const query = this.userRepository.createQueryBuilder('user').where('user.id = :id', { id });

    query
      .leftJoinAndSelect('user.userPartnerOrganisations', 'upo')
      .leftJoinAndSelect('upo.partnerOrganisation', 'porg')
      .leftJoinAndSelect('user.userOrganisations', 'uo')
      .leftJoinAndSelect('uo.organisation', 'org', 'org.id != :initOrgId', { initOrgId: INITIAL_ORGANISATION_ID })
      .leftJoinAndSelect('uo.role', 'role')

      .addSelect(
        `CASE WHEN user.affiliation != :affi THEN 'NOT_APPLICABLE' WHEN upo.userId = user.id IS NOT NULL THEN 'YES' ELSE 'NO' END`,
        'user_parent',
      )
      .setParameters({ affi: Affiliation.EXTERNAL });

    query.leftJoinAndMapMany(
      'user.documents',
      Document,
      'document',
      'document.entityId = :userId AND document.entityType = :entityType and document.type != :type',
      {
        entityType: EntityType.USER,
        userId: id,
        type: DocumentType.IMAGE,
      },
    );

    if (userRelationOptionsDto?.assets) {
      query.leftJoin('user.userAssets', 'uas').leftJoinAndMapMany('user.assets', Asset, 'asset', 'asset.id = uas.assetId');
    }

    query.leftJoinAndMapMany(
      'user.loas',
      Document,
      'documentloa',
      'documentloa.entityId = :userId AND documentloa.entityType = :entityType and documentloa.type IN (:...types) AND documentloa.organisationId IS NOT NULL',
      {
        entityType: EntityType.USER,
        userId: id,
        types: [DocumentType.LETTER_OF_AUTHORITY, DocumentType.LETTER_OF_AUTHORITY_GENERATED],
      },
    );

    const user: User & { assets?: UserAssetsDto[]; policies?: InsurancePolicyAssingDto[]; inviteSent?: Date } = await query.getOne();
    if (!user) throw new NotFoundException('User not found');

    if (userRelationOptionsDto?.includeLastInvite && user.status === UserStatusType.PENDING) {
      const invite = await this.notificationService.getUserInvite(user.id, 'DESC');
      if (invite) {
        user.inviteSent = invite.created;
      } else {
        console.log('No invite found');
      }
    }
    return user;
  }

  async findOneForDetailPage(
    id: string,
    userRelationOptionsDto?: UserRelationOptionsDto & {
      includeSubstitution?: boolean;
      organisationId?: string;
      includeLastInvite?: boolean;
      partnerOrganisationId?: string;
      includeInviterForOrganisationId?: boolean;
    },
  ): Promise<UserWithRelationsDto> {
    const query = this.userRepository.createQueryBuilder('user').where('user.id = :id', { id });

    if (userRelationOptionsDto?.partnerOrganisationId) {
      query
        .innerJoinAndSelect('user.userPartnerOrganisations', 'upo', 'upo.partnerOrganisationId = :porgId', {
          porgId: userRelationOptionsDto?.partnerOrganisationId,
        })
        .leftJoinAndSelect('upo.partnerOrganisation', 'porg')
        .leftJoinAndSelect('user.userOrganisations', 'uo')
        .leftJoinAndSelect('uo.organisation', 'org')
        .leftJoinAndSelect('uo.role', 'role', 'role.name IN (:...roles)', { roles: [Role.BROKER, Role.INSURER] });
    } else if (userRelationOptionsDto?.organisationId) {
      query
        .leftJoinAndSelect('user.userOrganisations', 'uo', 'uo.organisationId = :orgId', {
          orgId: userRelationOptionsDto?.organisationId,
        })
        .leftJoinAndSelect('uo.role', 'role');
    } else {
      query.leftJoinAndSelect('user.userOrganisations', 'uo').leftJoinAndSelect('uo.role', 'role');
      query.andWhere('role.name IN (:...roles)', { roles: [Role.ADMIN, Role.SUPER_ADMIN] });
    }

    query.leftJoinAndMapMany(
      'user.documents',
      Document,
      'document',
      'document.entityId = :userId AND document.entityType = :entityType and document.type != :type',
      {
        entityType: EntityType.USER,
        userId: id,
        type: DocumentType.IMAGE,
      },
    );

    query.leftJoinAndMapMany(
      'user.loas',
      Document,
      'documentloa',
      'documentloa.entityId = :userId AND documentloa.entityType = :entityType and documentloa.type IN (:...types) AND documentloa.organisationId IS NOT NULL',
      {
        entityType: EntityType.USER,
        userId: id,
        types: [DocumentType.LETTER_OF_AUTHORITY, DocumentType.LETTER_OF_AUTHORITY_GENERATED],
      },
    );

    query.leftJoinAndMapOne('user.substituting', User, 'sub', 'sub.id = uo.substituedBy');
    query
      .leftJoin(UserOrganisation, 'uosb', 'uosb.substituedBy = user.id AND uosb.organisationId = :orgId', {
        orgId: userRelationOptionsDto?.organisationId,
      })
      .leftJoinAndMapMany('user.substituteds', User, 'subted', 'subted.id = uosb.userId');
    query.leftJoinAndMapOne(
      'sub.avatar',
      Document,
      'subavatar',
      'subavatar.entityId = sub.id AND subavatar.entityType = :subentityType and subavatar.type = :subtype',
      {
        subentityType: EntityType.USER,
        subtype: DocumentType.IMAGE,
      },
    );

    if (userRelationOptionsDto?.assets) {
      query
        .leftJoin('user.userAssets', 'uas')
        .leftJoinAndMapMany('user.assets', Asset, 'asset', 'asset.id = uas.assetId AND asset.organisationId = :orgId', {
          orgId: userRelationOptionsDto?.organisationId,
        });
    }

    if (userRelationOptionsDto?.policies) {
      query
        .leftJoin('user.userPolicies', 'up')
        .leftJoinAndMapMany('user.policies', InsurancePolicy, 'policy', 'policy.id = up.insurancePolicyId AND policy.organisationId = :orgId', {
          orgId: userRelationOptionsDto?.organisationId,
        });
    }
    const user: User & {
      substitutingUser?: User;
      assets?: UserAssetsDto[];
      policies?: InsurancePolicyAssingDto[];
      inviteSent?: Date;
      currentOrganisationInvitation?: CurrentOrganisationInvitationDto;
    } = await query.getOne();
    if (!user) throw new NotFoundException('User not found');
    if (userRelationOptionsDto?.includeLastInvite && user.status === UserStatusType.PENDING) {
      const invite = await this.notificationService.getUserInvite(user.id, 'DESC');
      if (invite) {
        user.inviteSent = invite.created;
      } else {
        console.log('No invite found');
      }
    }

    if (userRelationOptionsDto?.includeInviterForOrganisationId && userRelationOptionsDto.organisationId) {
      const organisationInvitation = await this.userOrganisationService.getOrganisationInvitationForUser(
        user.id,
        userRelationOptionsDto.organisationId,
      );

      if (organisationInvitation !== null) {
        user.currentOrganisationInvitation = organisationInvitation;
      }
    }

    return user;
  }

  async getCountUserRoles(user: User, organisationId?: string): Promise<RoleCountDto> {
    if (organisationId) {
      const roleNamesInOrganisation = user.userOrganisations
        .filter((uo) => uo.organisationId === organisationId)
        .map((uo) => uo.role?.name)
        .filter((n) => Object.keys(this.roleConfig.roleConfigs).some((rc: Role) => rc === n && !!this.roleConfig.roleConfigs[rc].organisationMax));

      if (!roleNamesInOrganisation.length) {
        return {
          reinstatableInOrganisation: true,
          reinstatableInGlobal: null,
          role: roleNamesInOrganisation[0],
        };
      }

      const count = await this.userRepository
        .createQueryBuilder('user')
        .innerJoin('user.userOrganisations', 'uo', 'uo.organisationId = :orgId AND uo.userStatus = :uostatus', {
          orgId: organisationId,
          uostatus: UserOrganisationStatus.ACTIVE,
        })
        .innerJoin('uo.role', 'role', 'role.name = :roleName', { roleName: roleNamesInOrganisation[0] })
        .where('user.status IN (:...status)', { status: [UserStatusType.ACTIVE, UserStatusType.SUSPENDED, UserStatusType.PENDING] })
        .getCount();

      return {
        reinstatableInOrganisation: count < this.roleConfig.roleConfigs[roleNamesInOrganisation[0]].organisationMax,
        reinstatableInGlobal: null,
        role: roleNamesInOrganisation[0],
      };
    }

    const inactiveUserOrgs = await this.userOrganisationRepository.find({
      where: {
        userId: user.id,
        userStatus: UserOrganisationStatus.INACTIVE,
      },
      relations: ['role'],
    });

    if (!inactiveUserOrgs.length) {
      return { reinstatableInOrganisation: null, reinstatableInGlobal: true };
    }

    const orgIds = inactiveUserOrgs.map((uo) => uo.organisationId);
    const roleNames = inactiveUserOrgs
      .map((uo) => uo.role?.name)
      .filter((n) => Object.keys(this.roleConfig.roleConfigs).some((rc: Role) => rc === n && !!this.roleConfig.roleConfigs[rc].organisationMax));

    if (!roleNames.length) {
      return { reinstatableInOrganisation: null, reinstatableInGlobal: true };
    }

    const countsQuery = await this.userRepository
      .createQueryBuilder('user')
      .innerJoin('user.userOrganisations', 'uo', 'uo.organisationId IN (:...orgIds) AND uo.userStatus = :uostatus', {
        orgIds,
        uostatus: UserOrganisationStatus.ACTIVE,
      })
      .innerJoin('uo.role', 'role', 'role.name IN (:...roleNames)', { roleNames })
      .where('user.status IN (:...status)', { status: [UserStatusType.ACTIVE, UserStatusType.SUSPENDED, UserStatusType.PENDING] })
      .select('uo.organisationId', 'organisationId')
      .addSelect('role.name', 'roleName')
      .addSelect('COUNT(DISTINCT user.id)', 'count')
      .groupBy('uo.organisationId')
      .addGroupBy('role.name')
      .getRawMany();
    let maxRolecountInOrgs = 0;
    let valid = true;
    for (const countItem of countsQuery) {
      const count = parseInt(countItem.count, 10);
      if (count >= this.roleConfig.roleConfigs[countItem.roleName].organisationMax) {
        valid = false;
        return { reinstatableInOrganisation: null, reinstatableInGlobal: valid, role: countItem.roleName };
      }
      if (count > maxRolecountInOrgs) {
        maxRolecountInOrgs = count;
      }
    }

    return { reinstatableInOrganisation: null, reinstatableInGlobal: valid };
  }

  async findOneByPartnerOrganisation(userId: string, partnerOrganisationId: string) {
    return this.userRepository.findOne({
      where: { userPartnerOrganisations: { partnerOrganisationId, userId } },
      relations: { userPartnerOrganisations: true, userOrganisations: { organisation: true } },
    });
  }

  async findOne(
    id: string,
    userRelationOptionsDto?: UserRelationOptionsDto & { organisationId?: string; includeLastInvite?: boolean; partnerOrganisationId?: string },
  ) {
    const query = this.userRepository.createQueryBuilder('user').where('user.id = :id', { id });

    if (userRelationOptionsDto?.partnerOrganisationId) {
      query
        .innerJoinAndSelect('user.userPartnerOrganisations', 'upo', 'upo.partnerOrganisationId = :porgId', {
          porgId: userRelationOptionsDto?.partnerOrganisationId,
        })
        .leftJoinAndSelect('upo.partnerOrganisation', 'porg')
        .innerJoinAndSelect('user.userOrganisations', 'uo')
        .innerJoinAndSelect('uo.role', 'role', 'role.name IN (:...roles)', { roles: [Role.BROKER, Role.INSURER] });
    } else if (userRelationOptionsDto?.organisationId) {
      query
        .leftJoinAndSelect('user.userOrganisations', 'uo', 'uo.organisationId = :orgId AND uo.userStatus = :uostatus', {
          orgId: userRelationOptionsDto?.organisationId,
          uostatus: UserOrganisationStatus.ACTIVE,
        })
        .leftJoinAndSelect('uo.role', 'role');

      query.leftJoinAndMapMany(
        'user.documents',
        Document,
        'document',
        'document.entityId = :userId AND document.entityType = :entityType and document.type != :type AND (document.organisationId IS NULL OR document.organisationId = :orgId)',
        {
          entityType: EntityType.USER,
          userId: id,
          type: DocumentType.IMAGE,
          orgId: userRelationOptionsDto?.organisationId,
        },
      );
    } else {
      query.leftJoinAndSelect('user.userOrganisations', 'uo').leftJoinAndSelect('uo.role', 'role');
      query.andWhere('role.name IN (:...roles)', { roles: [Role.ADMIN, Role.SUPER_ADMIN] });
    }

    query.leftJoinAndMapOne(
      'user.avatar',
      Document,
      'avatar',
      'avatar.entityId = :userId AND avatar.entityType = :entityType and avatar.type = :type',
      {
        entityType: EntityType.USER,
        userId: id,
        type: DocumentType.IMAGE,
      },
    );

    if (userRelationOptionsDto?.assets) {
      query
        .leftJoin('user.userAssets', 'uas')
        .leftJoinAndMapMany('user.assets', Asset, 'asset', 'asset.id = uas.assetId AND asset.organisationId = :orgId', {
          orgId: userRelationOptionsDto?.organisationId,
        });
    }

    if (userRelationOptionsDto?.policies) {
      query
        .leftJoin('user.userPolicies', 'up')
        .leftJoinAndMapMany('user.policies', InsurancePolicy, 'policy', 'policy.id = up.insurancePolicyId AND policy.organisationId = :orgId', {
          orgId: userRelationOptionsDto?.organisationId,
        });
    }

    const user: User & { assets?: UserAssetsDto[]; policies?: InsurancePolicyAssingDto[]; inviteSent?: Date } = await query.getOne();
    if (!user) throw new NotFoundException('User not found');

    const mod = user.assets?.map((asset) => ({ id: asset.id, name: asset.name, address: asset.address, logo: asset.logo }));
    user.assets = mod ?? [];
    user.policies = user.policies?.map((policy) => {
      return { id: policy.id, leadInsurerOrganisationLogo: policy.leadInsurerOrganisationLogo, name: policy.name };
    });

    if (userRelationOptionsDto?.includeLastInvite && userRelationOptionsDto.organisationId && user.status === UserStatusType.PENDING) {
      const invite = await this.notificationService.getUserInvite(user.id);
      if (invite) {
        user.inviteSent = invite.created;
      } else {
        console.log('No invite found');
      }
    }

    return user;
  }

  async findManyByIds(
    ids: string[],
    options?: UserRelationOptionsDto & {
      organisationId?: string;
      partnerOrganisationId?: string;
      assets?: boolean;
      policies?: boolean;
      includeLastInvite?: boolean;
    },
  ): Promise<Array<User & { assets?: UserAssetsDto[]; policies?: InsurancePolicyAssingDto[]; inviteSent?: Date }>> {
    if (!ids.length) return [];
    const query = this.userRepository.createQueryBuilder('user').where('user.id IN (:...ids)', { ids });

    if (options?.partnerOrganisationId) {
      query
        .innerJoin('user.userPartnerOrganisations', 'upo', 'upo.partnerOrganisationId = :porgId', { porgId: options.partnerOrganisationId })
        .leftJoinAndSelect('upo.partnerOrganisation', 'porg')
        .innerJoinAndSelect('user.userOrganisations', 'uo')
        .innerJoinAndSelect('uo.role', 'role', 'role.name IN (:...roles)', { roles: [Role.BROKER, Role.INSURER] });
    } else if (options?.organisationId) {
      query
        .innerJoinAndSelect('user.userOrganisations', 'uo', 'uo.userStatus = :uostatus AND uo.organisationId = :orgId', {
          orgId: options.organisationId,
          uostatus: UserOrganisationStatus.ACTIVE,
        })
        .leftJoinAndSelect('uo.role', 'role')
        .andWhere('uo.organisationId = :orgId', { orgId: options.organisationId });

      query.leftJoinAndMapMany(
        'user.documents',
        Document,
        'document',
        'document.entityId IN (:...userIds) AND document.entityType = :entityType AND document.type != :docType AND uo.organisationId = document.organisationId',
        {
          entityType: EntityType.USER,
          docType: DocumentType.IMAGE,
          userIds: ids,
        },
      );
    } else {
      query
        .innerJoinAndSelect('user.userOrganisations', 'uo')
        .innerJoinAndSelect('uo.role', 'role')
        .andWhere('role.name IN (:...roles)', { roles: [Role.ADMIN, Role.SUPER_ADMIN] });
    }

    query.leftJoinAndMapOne(
      'user.avatar',
      Document,
      'avatar',
      'avatar.entityId IN (:...userIds) AND avatar.entityType = :entityType AND avatar.type = :docType',
      {
        entityType: EntityType.USER,
        docType: DocumentType.IMAGE,
        userIds: ids,
      },
    );

    if (options?.assets && options.organisationId) {
      query
        .leftJoin('user.userAssets', 'uas')
        .leftJoinAndMapMany('user.assets', Asset, 'asset', 'asset.id = uas.assetId AND asset.organisationId = :orgId', {
          orgId: options.organisationId,
        });
    }

    if (options?.policies && options.organisationId) {
      query
        .leftJoin('user.userPolicies', 'up')
        .leftJoinAndMapMany('user.policies', InsurancePolicy, 'policy', 'policy.id = up.insurancePolicyId AND policy.organisationId = :orgId', {
          orgId: options.organisationId,
        });
    }

    this.logger.debug(`Users.findManyByIds query (params: ${JSON.stringify({ ids, options })}) ` + query.getQueryAndParameters());

    const users = await query.getMany();
    if (!users.length) return [];

    users.forEach((user) => {
      const userWithAssets = user as User & { assets?: UserAssetsDto[]; policies?: InsurancePolicyAssingDto[] };
      if (userWithAssets.assets) {
        const mod = userWithAssets.assets.map((asset) => ({
          id: asset.id,
          name: asset.name,
          address: asset.address,
          logo: asset.logo,
        }));
        userWithAssets.assets = mod;
      }
      if (userWithAssets.policies) {
        userWithAssets.policies = userWithAssets.policies.map((policy) => {
          return {
            id: policy.id,
            leadInsurerOrganisationLogo: policy.leadInsurerOrganisationLogo,
            name: policy.name,
          };
        });
      }
    });

    if (options?.includeLastInvite && options.organisationId) {
      await Promise.all(
        users.map(async (user: User & { assets?: UserAssetsDto[]; policies?: InsurancePolicyAssingDto[]; inviteSent?: Date }) => {
          if (user.status === UserStatusType.PENDING) {
            const invite = await this.notificationService.getUserInvite(user.id);
            if (invite) user.inviteSent = invite.created;
          }
        }),
      );
    }
    return users;
  }

  findUserByOrganisationId(userId: string, organisationId: string) {
    return this.userRepository
      .createQueryBuilder('user')
      .innerJoin('user.userOrganisations', 'uo', 'uo.userStatus = :uostatus AND uo.organisationId = :orgId', {
        orgId: organisationId,
        uostatus: UserOrganisationStatus.ACTIVE,
      })
      .leftJoinAndSelect('uo.role', 'role')
      .leftJoinAndSelect('uo.organisation', 'org')
      .leftJoinAndMapOne('user.avatar', Document, 'avatar', 'avatar.entityId = :userId AND avatar.entityType = :entityType AND avatar.type = :type', {
        entityType: EntityType.USER,
        userId,
        type: DocumentType.IMAGE,
      })
      .where('user.id = :userId', { userId })
      .andWhere('user.status IN (:...status)', { status: [UserStatusType.ACTIVE, UserStatusType.SUSPENDED] })
      .andWhere('uo.organisationId = :orgId', { orgId: organisationId })
      .getOne();
  }

  findOneByEmail(email: string, options?: FindManyOptions<User>): Promise<User> {
    const qb = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.userOrganisations', 'uo')
      .leftJoinAndSelect('uo.role', 'role')
      .where('user.email = :email', { email });

    if (Array.isArray(options?.relations)) {
      options.relations.forEach((relation) => {
        qb.leftJoinAndSelect(`user.${relation}`, relation);
      });
    }

    return qb.getOne();
  }

  hashToken(token: string) {
    return crypto.createHash('sha256').update(token, 'utf8').digest('hex');
  }

  generateToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  saveToken(userId: string, token: string, type: UserTokenType, expiresAt: string) {
    return this.userTokenRepository
      .createQueryBuilder('user_token')
      .insert()
      .into(UserToken)
      .values({
        tokenHash: token,
        expiresAt: () => `CURRENT_TIMESTAMP + INTERVAL '${expiresAt} days'`,
        userId,
        type,
      })
      .execute();
  }

  saveTokenHash(userId: string, token: string, type: UserTokenType, expiresAt: string) {
    return this.userTokenRepository
      .createQueryBuilder('user_token')
      .insert()
      .into(UserToken)
      .values({
        tokenHash: this.hashToken(token),
        expiresAt: () => `CURRENT_TIMESTAMP + INTERVAL '${expiresAt} days'`,
        userId,
        type,
      })
      .execute();
  }

  deleteTokenHash(token: string) {
    return this.userTokenRepository.softDelete({ tokenHash: this.hashToken(token) });
  }

  deleteTokenType(userId: string, type: UserTokenType, soft?: boolean) {
    if (soft) {
      return this.userTokenRepository.softDelete({ userId, type });
    }
    return this.userTokenRepository.delete({ userId, type });
  }

  findTokenByUserIdTokenType(userId: string, type: UserTokenType) {
    return this.userRepository
      .createQueryBuilder('user')
      .innerJoin('user.userTokens', 'token', `token.expiresAt > CURRENT_TIMESTAMP AND token.userId = :userId AND type=:type`, {
        userId,
        type,
      })
      .leftJoinAndMapOne(
        'user.avatar',
        Document,
        'avatar',
        'avatar.entityId = user.id AND avatar.entityType = :entityType AND avatar.type = :docType',
        {
          entityType: EntityType.USER,
          docType: DocumentType.IMAGE,
        },
      )
      .getOne();
  }

  getActivationTokenByUserId(userId: string) {
    return this.userRepository
      .createQueryBuilder('user')
      .innerJoinAndSelect('user.userTokens', 'token', `token.expiresAt > CURRENT_TIMESTAMP AND token.userId = :userId AND type=:type`, {
        userId,
        type: UserTokenType.ACTIVATE,
      })
      .getOne();
  }

  findOneByToken(token: string, type: UserTokenType): Promise<User> {
    const tokenHash = type === UserTokenType.ACTIVATE ? token : this.hashToken(token);

    return this.userRepository
      .createQueryBuilder('user')
      .innerJoin('user.userTokens', 'token', `token.expiresAt > CURRENT_TIMESTAMP AND token.tokenHash = :tokenHash AND type=:type`, {
        tokenHash: tokenHash,
        type,
      })
      .innerJoinAndSelect('user.userOrganisations', 'uo')
      .leftJoinAndMapOne(
        'user.avatar',
        Document,
        'avatar',
        'avatar.entityId = user.id AND avatar.entityType = :entityType AND avatar.type = :docType',
        {
          entityType: EntityType.USER,
          docType: DocumentType.IMAGE,
        },
      )
      .getOne();
  }

  getSpecialSortFields(): Record<string, AddSortConditionToQueryBuilderFunction> {
    return {
      name: (qb, order) => {
        qb.addOrderBy(`user.firstName`, order);
        qb.addOrderBy(`user.lastName`, order);
      },
    };
  }

  getSpecialPartnerOrgListUserSearchFields(): Record<string, AddSearchTermToQueryBuilderFunction> {
    return {
      all: (qb, term) => {
        qb.andWhere(
          new Brackets((q) => {
            q.orWhere(`LOWER(user.firstName || ' ' || user.lastName) ilike :term`, {
              term: `%${term}%`,
            });
          }),
        );
      },
    };
  }

  getSpecialSearchFields(): Record<string, AddSearchTermToQueryBuilderFunction> {
    return {
      all: (qb, term) => {
        qb.andWhere(
          new Brackets((q) => {
            q.orWhere(`LOWER(user.firstName || ' ' || user.lastName) ilike :term`, {
              term: `%${term}%`,
            });
            q.orWhere(`LOWER(CAST(role.name AS text)) ILIKE :term`, {
              term: `%${term.toLowerCase()}%`,
            });
          }),
        );
      },
    };
  }

  async removeExpired() {
    const appConfig = this.config.get<AppConfigType>('app');
    const removeAfter = new Date();
    removeAfter.setFullYear(removeAfter.getFullYear() - appConfig.users.removeExpiredInYears);

    return this.userRepository.update({ inactivatedAt: LessThan(removeAfter), status: UserStatusType.INACTIVE }, { deletedAt: new Date() });
  }

  async partnerOrganisationList(partnerUserOptionsDto: PartnerUserOptionsDto & { partnerOrganisationId: string }): Promise<[UserDto[], PageMetaDto]> {
    const qb = this.userRepository
      .createQueryBuilder('user')
      .innerJoinAndSelect('user.userPartnerOrganisations', 'upo', 'upo.partnerOrganisationId = :porgId', {
        porgId: partnerUserOptionsDto.partnerOrganisationId,
      })
      .innerJoin('upo.partnerOrganisation', 'porg')
      .addSelect(['porg.id', 'porg.orgName', 'porg.type', 'porg.hoAddress'])
      .skip(partnerUserOptionsDto.skip)
      .take(partnerUserOptionsDto.take);

    if (partnerUserOptionsDto.status) {
      qb.andWhere('user.status IN (:...status)', {
        status: partnerUserOptionsDto.status,
      });
    }

    if (partnerUserOptionsDto.regularMembers) {
      qb.andWhere('upo.isAdmin IS NOT TRUE AND upo.isKeycontact IS NOT TRUE');
    }

    this.applySearchConditionsToQueryBuilder({
      searchConditions: partnerUserOptionsDto.searchConditions,
      getSpecialSearchFields: this.getSpecialPartnerOrgListUserSearchFields,
      qb,
    });

    // Add ordering by first name, then last name alphabetically
    qb.orderBy('user.firstName', 'ASC').addOrderBy('user.lastName', 'ASC');

    const [entities, itemCount] = await qb.getManyAndCount();

    const pageMetaDto = new PageMetaDto({
      itemCount,
      pageOptionsDto: partnerUserOptionsDto,
    });

    return [entities, pageMetaDto];
  }
  async listMembers(userMemberOptionsDto: UserMemberOptionsDto): Promise<[UserDto[], PageMetaDto]> {
    const qb = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.userOrganisations', 'org')
      .leftJoinAndSelect('org.role', 'role')
      .leftJoinAndSelect('user.userPartnerOrganisations', 'upo')
      .leftJoinAndSelect('upo.partnerOrganisation', 'porg')
      .addSelect(
        `CASE WHEN user.affiliation != :affi THEN 'NOT_APPLICABLE' WHEN upo.userId = user.id IS NOT NULL THEN 'YES' ELSE 'NO' END`,
        'user_parent',
      )
      .addSelect(`CASE WHEN (user.status = :deactivated) then 0 else 1 end`, '_rank')
      .setParameters({ affi: Affiliation.EXTERNAL, deactivated: UserStatusType.INACTIVE })
      .orderBy('_rank', 'DESC')

      .skip(userMemberOptionsDto.skip)
      .take(userMemberOptionsDto.take);

    this.applySortingToQueryBuilder({
      qb,
      alias: 'user',
      sortBy: userMemberOptionsDto.sortBy,
      getSpecialSortFields: this.getSpecialSortFields,
      defaultOrder: { field: 'name', order: userMemberOptionsDto.orderBy as Order },
    });
    
    if (userMemberOptionsDto.organisationId) {
      qb.andWhere('org.organisationId = :organisationId', { organisationId: userMemberOptionsDto.organisationId });
      
      // "My Team" should show:
      // 1. Internal users (not in partner organizations)
      // 2. External users who are assigned to assets/policies/engagements in this organization
      // 3. Brokers who have created policies/engagements for this organization
      qb.andWhere(
        new Brackets((subQb) => {
          // Include users who are NOT in partner organizations (internal users)
          subQb.orWhere('upo.userId IS NULL')
          // OR include users who are in partner organizations but have active assignments in this organization
          .orWhere(
            'EXISTS (' +
            'SELECT 1 FROM user_asset ua ' +
            'INNER JOIN asset a ON a.id = ua.asset_id ' +
            'WHERE ua.user_id = user.id AND a.organisation_id = :organisationId AND ua.expires_at IS NULL' +
            ')'
          )
          // OR include users who have policy assignments in this organization
          .orWhere(
            'EXISTS (' +
            'SELECT 1 FROM user_asset ua ' +
            'WHERE ua.user_id = user.id AND ua.entity_type = :policyEntityType AND ua.expires_at IS NULL AND ' +
            'EXISTS (SELECT 1 FROM insurance_policy ip WHERE ip.id = ua.entity_id AND ip.organisation_id = :organisationId)' +
            ')'
          )
          // OR include users who have engagement assignments in this organization
          .orWhere(
            'EXISTS (' +
            'SELECT 1 FROM user_asset ua ' +
            'WHERE ua.user_id = user.id AND ua.entity_type = :engagementEntityType AND ua.expires_at IS NULL AND ' +
            'EXISTS (SELECT 1 FROM insurer_engagement ie WHERE ie.id = ua.entity_id AND ie.organisation_id = :organisationId)' +
            ')'
          )
          // OR include brokers who have created policies for this organization
          .orWhere(
            '(role.name = :brokerRole AND ' +
            'EXISTS (SELECT 1 FROM insurance_policy ip WHERE ip.created_by_id = user.id AND ip.organisation_id = :organisationId)' +
            ')'
          )
          // OR include brokers who have created engagements for this organization
          .orWhere(
            '(role.name = :brokerRole AND ' +
            'EXISTS (SELECT 1 FROM insurer_engagement ie WHERE ie.created_by_id = user.id AND ie.organisation_id = :organisationId)' +
            ')'
          );
        })
      );
      
      qb.setParameter('brokerRole', Role.BROKER)
        .setParameter('policyEntityType', EntityType.INSURANCE_POLICY)
        .setParameter('engagementEntityType', EntityType.INSURER_ENGAGEMENT);
    }
    this.applySearchConditionsToQueryBuilder({
      searchConditions: userMemberOptionsDto.searchConditions,
      getSpecialSearchFields: this.getSpecialPartnerOrgListUserSearchFields,
      qb,
    });

    if (userMemberOptionsDto.role && userMemberOptionsDto.role.length > 0) {
      qb.andWhere('role.name IN (:...role)', {
        role: userMemberOptionsDto.role,
      });
    }

    if (userMemberOptionsDto.status && userMemberOptionsDto.status.length > 0) {
      qb.andWhere('user.status IN (:...status)', {
        status: userMemberOptionsDto.status,
      });
    }

    if (userMemberOptionsDto.affiliation) {
      qb.andWhere('user.affiliation IN (:...affiliation)', {
        affiliation: userMemberOptionsDto.affiliation,
      });
    }

    if (userMemberOptionsDto.parent) {
      qb.andWhere(
        `CASE
          WHEN user.affiliation != :affi THEN 'NOT_APPLICABLE'
          WHEN upo.userId IS NOT NULL THEN 'YES'
          ELSE 'NO'
         END IN (:...parent)`,
        { affi: Affiliation.EXTERNAL, parent: userMemberOptionsDto.parent },
      );
    }

    const [entities, itemCount] = await qb.getManyAndCount();

    const pageMetaDto = new PageMetaDto({
      itemCount,
      pageOptionsDto: userMemberOptionsDto,
    });

    return [entities, pageMetaDto];
  }

  async list(userOptionsDto: UserOptionsDto, currentUser: CurrentUser): Promise<[UserDto[], PageMetaDto]> {
    const allowedRoles = rolesCanMap[userOptionsDto.scope || 'LIST'][currentUser.role.name];
    const _allowedRoles = userOptionsDto.role ? [...userOptionsDto.role] : [];

    let organisationId = userOptionsDto.organisationId || currentUser.currentOrganisationId;

    if (!currentUser.ability.can(userPermissions.members.manage, EntityType.USER)) {
      organisationId = currentUser.currentOrganisationId;
    }

    if (userOptionsDto.role) {
      userOptionsDto.role = userOptionsDto.role.filter((role) => allowedRoles.includes(role));
    } else {
      userOptionsDto.role = allowedRoles;
    }

    const qb = this.userRepository
      .createQueryBuilder('user')
      .innerJoinAndSelect('user.userOrganisations', 'org', 
        currentUser.role.name === Role.SUPER_ADMIN 
          ? 'org.organisationId IN (:...orgIds)' 
          : 'org.organisationId = :currentOrganisationId', 
        currentUser.role.name === Role.SUPER_ADMIN 
          ? { orgIds: [organisationId, INITIAL_ORGANISATION_ID] }
          : { currentOrganisationId: organisationId }
      )
      .leftJoinAndSelect('org.role', 'role')
      .addSelect(`CASE WHEN (user.status = :deactivated OR org.userStatus = :uostatus) then 0 else 1 end`, '_rank')
      .setParameters({ deactivated: UserStatusType.INACTIVE, uostatus: UserOrganisationStatus.INACTIVE })
      .orderBy('_rank', 'DESC')
      .skip(userOptionsDto.skip)
      .take(userOptionsDto.take);

    if (currentUser.role.name === Role.BROKER && userOptionsDto.scope === UserListScope.LIST) {
      qb.andWhere('user.invitedBy = :invitedBy', { invitedBy: currentUser.id });
    }

    if (userOptionsDto.substituted) {
      qb.andWhere('org.substituedBy IS NOT NULL');
    }

    qb.leftJoinAndMapOne(
      'user.avatar',
      Document,
      'avatar',
      `avatar.entityId = user.id AND avatar.entityType = :entityType AND avatar.type = :docType`,
      {
        entityType: EntityType.USER,
        docType: DocumentType.IMAGE,
      },
    );

    this.applySortingToQueryBuilder({
      qb,
      alias: 'user',
      sortBy: userOptionsDto.sortBy,
      getSpecialSortFields: this.getSpecialSortFields,
      defaultOrder: { field: 'name', order: userOptionsDto.orderBy as Order },
    });

    this.applySearchConditionsToQueryBuilder({
      searchConditions: userOptionsDto.searchConditions,
      getSpecialSearchFields: this.getSpecialSearchFields,
      qb,
    });

    if (userOptionsDto.status) {
      const statusConditions = [
        {
          id: 1,
          status: UserStatusType.PENDING,
          orgUserStatus: [UserOrganisationStatus.ACTIVE],
          userStatus: [UserStatusType.PENDING],
        },
        {
          id: 2,
          status: UserStatusType.ACTIVE,
          orgUserStatus: [UserOrganisationStatus.ACTIVE],
          userStatus: [UserStatusType.ACTIVE],
        },
        {
          id: 3,
          status: UserStatusType.INACTIVE,
          orgUserStatus: [UserOrganisationStatus.INACTIVE],
          userStatus: [
            UserStatusType.ACTIVE,
            UserStatusType.INACTIVE,
            UserStatusType.OFFBOARD_PENDING,
            UserStatusType.PENDING,
            UserStatusType.SUSPENDED,
          ],
        },
        {
          id: 4,
          status: UserStatusType.OFFBOARD_PENDING,
          orgUserStatus: [UserOrganisationStatus.ACTIVE],
          userStatus: [UserStatusType.OFFBOARD_PENDING],
        },
        {
          id: 5,
          status: UserStatusType.SUSPENDED,
          orgUserStatus: [UserOrganisationStatus.ACTIVE],
          userStatus: [UserStatusType.SUSPENDED],
        },
      ];

      qb.andWhere(
        new Brackets((q) => {
          statusConditions.forEach(({ id, status, orgUserStatus, userStatus }) => {
            if (userOptionsDto.status.includes(status)) {
              q.orWhere(`org.userStatus IN (:...orgUserStatus${id}) AND user.status IN (:...userStatus${id})`, {
                [`orgUserStatus${id}`]: orgUserStatus,
                [`userStatus${id}`]: userStatus,
              });
            }
          });
        }),
      );
    }

    if (userOptionsDto.role && userOptionsDto.role.length > 0) {
      qb.andWhere('role.name IN (:...role)', {
        role: userOptionsDto.role,
      });
    }

    // If user cannot filter on currentUser role, only show currentUser
    if (
      userOptionsDto.role.length === 0 &&
      _allowedRoles.length === 1 &&
      _allowedRoles[0] === currentUser.role.name &&
      !rolesCanMap[userOptionsDto.scope || 'LIST'][currentUser.role.name].includes(_allowedRoles[0])
    ) {
      qb.orWhere('user.id = :id', { id: currentUser.id });
    } else if (_allowedRoles.length > 0) {
      qb.andWhere('role.name IN (:...allowedRoles)', {
        allowedRoles: _allowedRoles,
      });
    }

    if (userOptionsDto.affiliation) {
      qb.andWhere('user.affiliation IN (:...affiliation)', {
        affiliation: userOptionsDto.affiliation,
      });
    }

    if (organisationId && currentUser.role.name !== Role.SUPER_ADMIN) {
      qb.andWhere('org.organisationId = :orgId', {
        orgId: organisationId,
      });
    }

    if ([Role.PAC, Role.HEAD_OFFICE].includes(currentUser.role.name) && userOptionsDto.scope === UserListScope.LIST) {
      qb.andWhere((sub) => {
        const subQuery = sub
          .subQuery()
          .select('ua.userId')
          .from(UserAsset, 'ua')
          .leftJoin('ua.user', 'u')
          .leftJoin(UserAsset, 'cua', 'cua.userId = :currenUid', { currenUid: currentUser.id })
          .innerJoin('u.userOrganisations', 'uo', 'uo.organisationId = :orgId', { orgId: organisationId })
          .where('ua.assetId = cua.assetId')
          .andWhere(userOptionsDto.affiliation ? 'u.affiliation in (:...af)' : '1=1', {
            af: userOptionsDto.affiliation,
          })
          .andWhere(userOptionsDto.status ? 'u.status in (:...st)' : '1=1', {
            st: userOptionsDto.status,
          })
          .getQuery();

        return `(user.id IN (${subQuery}))`;
      });
    }

    if (currentUser.role.name === Role.SAC && userOptionsDto.scope === UserListScope.LIST) {
      qb.andWhere((sub) => {
        const subQuery = sub
          .subQuery()
          .select('ua.userId')
          .from(UserAsset, 'ua')
          .leftJoin(UserAsset, 'cua', 'cua.userId = :currenUid', { currenUid: currentUser.id })
          .leftJoin('ua.user', 'u')
          .where('ua.assetId = cua.assetId')
          .getQuery();

        return `(user.id IN (${subQuery}))`;
      });

      const allowedFilteredRoles = _allowedRoles.slice().filter((r) => [Role.MAC, Role.IPC].includes(r));

      if (allowedFilteredRoles.length > 0) {
        qb.orWhere((qb) => {
          const subQuery = qb
            .subQuery()
            .select('u.id')
            .from(User, 'u')
            .innerJoin('u.userOrganisations', 'uo', 'uo.organisationId = :orgId', { orgId: organisationId })
            .innerJoin('uo.role', 'r')
            .where('r.name IN (:...ar)', { ar: allowedFilteredRoles })
            .andWhere(userOptionsDto.affiliation ? 'u.affiliation in (:...af)' : '1=1', {
              af: userOptionsDto.affiliation,
            })
            .andWhere(userOptionsDto.status ? 'u.status in (:...st)' : '1=1', {
              st: userOptionsDto.status,
            })
            .getQuery();

          return `(user.id IN (${subQuery}))`;
        });
      }

      if (userOptionsDto.role.includes(Role.PAC) || userOptionsDto.role.includes(Role.HEAD_OFFICE)) {
        qb.orWhere('role.name IN (:...role) AND user.invitedBy = :invitedBy', {
          role: userOptionsDto.role.filter((r) => [Role.PAC, Role.HEAD_OFFICE].includes(r)),
          invitedBy: currentUser.id,
        });
      }
    }

    // Always include current user if not filtering
    if (
      userOptionsDto.scope === UserListScope.LIST &&
      (_allowedRoles.length === 0 || _allowedRoles.includes(currentUser.role.name)) &&
      (!userOptionsDto.affiliation || userOptionsDto.affiliation.includes(currentUser.affiliation)) &&
      (!userOptionsDto.status || userOptionsDto.status.includes(currentUser.status))
    ) {
      qb.orWhere('user.id = :id', { id: currentUser.id });
    }

    const result = await qb.getManyAndCount();

    if (!currentUser.ability.can(userPermissions.teamMembers.listAllExternals, EntityType.USER)) {
      // We query all external users who are assigned to the same assets in the org
      const rows = await this.userRepository.manager.query(
        `select u.id from "user" u
            inner join user_organisation uo on uo.user_id = u.id
            inner join role r on r.id = uo.role_id
            inner join user_asset ua on ua.user_id = u.id
            inner join asset a on a.id = ua.asset_id and a.deleted_at is null
          where u.affiliation = 'external' and a.id in (
                select ua.asset_id  from user_asset ua
                  inner join asset a on a.id = ua.asset_id
                where a.organisation_id = $1 and  ua.user_id = $2
              )`,
        [organisationId, currentUser.id],
      );
      const externalUserIds = rows.map((row) => row.id);
      result[0] = result[0].filter(
        (user) =>
          user.id === currentUser.id ||
          (user.affiliation === Affiliation.EXTERNAL && externalUserIds.includes(user.id)) ||
          // TODO: remove this line when we have a proper permission for brokers
          (user.affiliation === Affiliation.EXTERNAL &&
            user.userOrganisations?.find((uo) => uo.organisationId === organisationId)?.role?.name === Role.BROKER) ||
          user.affiliation !== Affiliation.EXTERNAL,
      );
      result[1] = result[0].length;
    }

    return [
      result[0].map((user) => new UserDto(user)),
      new PageMetaDto({
        itemCount: result[1],
        pageOptionsDto: userOptionsDto,
      }),
    ];
  }

  async activateAssignAsset(activateUserDto: ActivateUserDto, templateParams?: Record<string, any>) {
    const userAssets = await this.userAssetRepository.find({
      where: {
        userId: In(activateUserDto.userIds),
        assetId: In(activateUserDto.assetIds),
        entityType: activateUserDto.entityType,
        entityId: activateUserDto.entityId,
      },
    });
    const queryRunner = this.userAssetRepository.manager.connection.createQueryRunner();
    await this.transaction(null, queryRunner, async () => {
      if (userAssets.length === 0) return;

      await queryRunner.manager.delete(
        UserAsset,
        userAssets.map((ua) => ua.id),
      );

      const updatedUserAssets = userAssets.filter((ua) => {
        return ua.isDraft === true;
      });

      for (const ua of updatedUserAssets) {
        const updateUa: Partial<UserAsset> = {
          isDraft: false,
          expiresAt: activateUserDto.expiresAt,
          assignedById: activateUserDto.currentUser.id,
        };

        await queryRunner.manager.save(UserAsset, {
          ...ua,
          ...updateUa,
        });
      }

      const users = await this.userRepository.find({
        where: {
          userOrganisations: { organisationId: activateUserDto.currentUser.currentOrganisationId, userStatus: UserOrganisationStatus.ACTIVE },
          id: In(updatedUserAssets.map((u) => u.userId)),
          lastLogin: null,
          status: UserStatusType.PENDING,
        },
        relations: { userOrganisations: { role: true } },
      });

      if (users.length > 0) {
        for (const user of users) {
          await this.activateUser(user, activateUserDto.organisationId, activateUserDto.userType, templateParams);
        }
      }
    });
  }

  async removeDraftAssignAsset(userIds: string[], assetIds: string[], entityType: EntityType, entityId: string, userType?: AssignUserType) {
    const entities = await this.userAssetRepository.find({
      where: { isDraft: true, userId: In(userIds), assetId: In(assetIds), entityType, entityId, userType },
    });
    return this.userAssetRepository.remove(entities);
  }

  async unAssignAsset(userIds: string[], assetIds: string[], entityType: EntityType, entityId: string, userType?: AssignUserType) {
    const entities = await this.userAssetRepository.find({ where: { userId: In(userIds), assetId: In(assetIds), entityType, entityId, userType } });
    const queryRunner = this.userRepository.manager.connection.createQueryRunner();
    await this.transaction(null, queryRunner, async () => {
      await queryRunner.manager.softRemove(UserAsset, entities);

      if (entityType === EntityType.INSURANCE_POLICY) {
        await queryRunner.manager.delete(BrokerPack, { policyId: entityId, userId: In(userIds) });
      }
    });
  }

  async assignAsset(
    createAssignToolDto: CreateAssignToolDto,
    sync = false,
    entityType: EntityType | null = null,
    entityId: string | null = null,
    templateParams?: Record<string, any>,
    currnetUser?: CurrentUser,
  ) {
    const userType: null | AssignUserType = createAssignToolDto.userType ?? null;

    const skipExisting = await this.findExistingAssignments(createAssignToolDto.assign, createAssignToolDto.to, entityType, entityId);

    let skipDrafts = [] as UserAsset[];
    if (createAssignToolDto.isDraft) {
      skipDrafts = await this.skipExistingDrafteds(createAssignToolDto.assign, createAssignToolDto.to, entityType, entityId, userType);
    }

    let userAssetRelations = [] as UserAsset[];
    createAssignToolDto.to.forEach((assetId) => {
      createAssignToolDto.assign.forEach((userId) => {
        if (skipDrafts.some((ua) => ua.userId === userId && ua.assetId === assetId && ua.entityType === entityType && ua.entityId === entityId))
          return;
        if (skipExisting.some((ua) => ua.userId === userId && ua.assetId === assetId && ua.entityType === entityType && ua.entityId === entityId))
          return;
        userAssetRelations.push(
          this.userAssetRepository.create({
            userId,
            assetId,
            expiresAt: createAssignToolDto.expiresAt,
            entityType,
            entityId,
            userType,
            isDraft: !!createAssignToolDto?.isDraft,
            assignedById: currnetUser?.id,
          }),
        );
      });
    });
    let result = null;
    if (!sync) {
      userAssetRelations = [];
      createAssignToolDto.to.forEach((assetId) => {
        createAssignToolDto.assign.forEach((userId) => {
          if (skipDrafts.some((ua) => ua.userId === userId && ua.assetId === assetId && ua.entityType === entityType && ua.entityId === entityId))
            return;
          if (skipExisting.some((ua) => ua.userId === userId && ua.assetId === assetId && ua.entityType === entityType && ua.entityId === entityId))
            return;
          userAssetRelations.push(
            this.userAssetRepository.create({
              userId,
              assetId,
              expiresAt: createAssignToolDto.expiresAt,
              entityType,
              entityId,
              userType,
              isDraft: !!createAssignToolDto?.isDraft,
              assignedById: currnetUser?.id,
            }),
          );
        });
      });
      result = await this.userAssetRepository.save(userAssetRelations);
    } else {
      const queryRunner = this.userRepository.manager.connection.createQueryRunner();
      const toRemove = await this.removeAssignAssetDiff(
        createAssignToolDto.assign,
        createAssignToolDto.to,
        currnetUser.currentOrganisationId,
        entityType,
        entityId,
      );
      result = await this.transaction(null, queryRunner, async () => {
        await queryRunner.manager.remove(
          toRemove.filter((ua) => {
            return userType === null || ua.userType === userType;
          }),
        );
        await queryRunner.manager.save(userAssetRelations);
      });
    }

    if (entityType !== EntityType.INSURANCE_POLICY && entityType !== EntityType.INSURER_ENGAGEMENT) {
      const users = await this.findAllByIds(userAssetRelations.map((ua) => ua.userId));
      const userAssets = await this.userAssetRepository.find({
        relations: { asset: true },
        where: { assetId: In(userAssetRelations.map((ua) => ua.assetId)) },
      });
      const hasLiveAsset = userAssets.some((a) => [AssetStatus.LIVE, AssetStatus.WAITING_FOR_OFFBOARDING].includes(a.asset.status));

      if (userAssets.length === 0) return result;

      const orgId = userAssets[0].asset.organisationId;

      for (const user of users) {
        const userOrganisation = user.userOrganisations.find((uo) => uo.organisationId === orgId);
        const roleName = userOrganisation.role.name;
        if (
          userOrganisation.userStatus === UserOrganisationStatus.ACTIVE &&
          roleName === Role.HEAD_OFFICE &&
          hasLiveAsset &&
          user.status === UserStatusType.PENDING
        ) {
          await this.activateUser(user, orgId, userType, templateParams);
        } else if (
          userOrganisation.userStatus === UserOrganisationStatus.ACTIVE &&
          user.status === UserStatusType.PENDING &&
          roleName !== Role.HEAD_OFFICE
        ) {
          await this.activateUser(user, orgId, userType, templateParams);
        }
      }
    }

    return result;
  }

  async updateAssignAsset(createAssignToolDto: CreateAssignToolDto, entityType: EntityType | null = null, entityId: string | null = null) {
    const { assign: userIds, to: assetIds, expiresAt } = createAssignToolDto;

    const existing = await this.findExistingAssignments(userIds, assetIds, entityType, entityId);

    existing.forEach((ua) => {
      ua.expiresAt = expiresAt;
    });

    return this.userAssetRepository.save(existing);
  }

  async skipExistingDrafteds(userIds: string[], assetIds: string[], entityType: EntityType, entityId: string, userType: AssignUserType) {
    return this.userAssetRepository.find({
      where: { isDraft: true, userId: In(userIds), assetId: In(assetIds), entityType, entityId, userType },
    });
  }

  async findAssignementsByEntityType(entityType: EntityType, entityId: string) {
    let options: FindManyOptions<UserAsset> = { where: { entityType, entityId } };
    if (entityType === EntityType.INSURANCE_POLICY) {
      options = { ...options, where: { ...options.where, isDraft: false } };
    }

    return this.userAssetRepository.find(options);
  }

  async findExistingAssignments(userIds: string[], assetIds: string[], entityType: EntityType | null = null, entityId: string | null = null) {
    const options: FindManyOptions<UserAsset> = { where: { expiresAt: IsNull(), userId: In(userIds), assetId: In(assetIds) } };
    if (entityType) options.where = { ...options.where, entityType };
    if (entityId) options.where = { ...options.where, entityId };
    return this.userAssetRepository.find(options);
  }

  async removeAssignAssetDiff(
    userIds: string[],
    assetIds: string[],
    organisationId: string,
    entityType: EntityType | null = null,
    entityId: string | null = null,
  ) {
    const options = buildAllAssignFindCondition(userIds, assetIds, organisationId, entityType, entityId);
    const allAssigns = await this.userAssetRepository.find({
      relations: { user: { userOrganisations: { role: true } } },
      ...options,
    });

    const sentAssigns = await this.userAssetRepository.find({
      where: { userId: In(userIds), assetId: In(assetIds), entityId, entityType },
      relations: { user: { userOrganisations: { role: true } } },
    });

    return allAssigns.filter(
      (assign) =>
        !sentAssigns.some(
          (sent) =>
            sent.userId === assign.userId &&
            sent.assetId === assign.assetId &&
            sent.entityId === assign.entityId &&
            sent.entityType === assign.entityType,
        ),
    );
  }

  async getUserAssetByEntityType(entityType: EntityType, entityId: string) {
    return this.userAssetRepository.find({ where: { entityType, entityId } });
  }

  createEntity(data: DeepPartial<CreateUserDto>) {
    return this.userRepository.create(data);
  }

  async findFirstStepsInvitedUsersBy(roles: Role[]) {
    const data = (await this.userRepository
      .createQueryBuilder('user')
      .innerJoinAndSelect('user.userOrganisations', 'uo', 'uo.userStatus = :uostatus', { uostatus: UserOrganisationStatus.ACTIVE })
      .leftJoinAndSelect('uo.role', 'role')
      .andWhere('user.status IN (:...status)', { status: [UserStatusType.ACTIVE, UserStatusType.SUSPENDED] })
      .leftJoinAndMapMany(
        'user.invitedNotLoggedinUsers',
        User,
        'niu',
        "niu.invitedBy = user.id AND DATE(niu.created) = DATE(uo.firstStepsState -> 'addUsers' ->> 'completed') AND " +
          "DATE(uo.firstStepsState -> 'addUsers' ->> 'completed') = CURRENT_DATE - INTERVAL '5 days' AND " +
          'niu.status = :pending',
      )

      .leftJoinAndMapMany(
        'user.allInvitedNotLoggedinUsers',
        User,
        'iu',
        "niu.invitedBy = user.id AND iu.status = :pending AND DATE(iu.created) = DATE(uo.firstStepsState -> 'addUsers' ->> 'completed') AND iu.lastLogin IS NULL",
      )
      .setParameter('pending', UserStatusType.PENDING)
      .andWhere('role.name in (:...roles)', { roles })
      .andWhere("user.meta ->> 'notifiedFirstStepsUserInvite' IS NULL")
      .getMany()) as (User & { invitedNotLoggedinUsers: User[]; allInvitedNotLoggedinUsers: User[] })[];

    const users = data.reduce((acc, v) => {
      v.userOrganisations.forEach((uo) => {
        if (!acc.has(uo)) {
          acc.set(uo, { uo, recipients: [], invitedNotLoggedinUsers: [], allInvitedNotLoggedinUsers: [] });
        }

        const orgData = acc.get(uo);
        orgData.invitedNotLoggedinUsers.push(...v.invitedNotLoggedinUsers);
        orgData.allInvitedNotLoggedinUsers.push(...v.allInvitedNotLoggedinUsers);
        orgData.recipients.push(v);
      });
      return acc;
    }, new Map<UserOrganisation, { uo: UserOrganisation; recipients: User[]; invitedNotLoggedinUsers: User[]; allInvitedNotLoggedinUsers: User[] }>());

    return users;
  }

  async findByRoleInOrganisation(organisationId: string, roles: Role[], status?: UserStatusType[]) {
    this.userRepository.createQueryBuilder('user');

    return this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.userOrganisations', 'uo', 'uo.organisationId = :organisationId AND uo.userStatus = :uostatus', {
        organisationId,
        uostatus: UserOrganisationStatus.ACTIVE,
      })
      .leftJoinAndSelect('uo.organisation', 'org')
      .leftJoinAndSelect('uo.role', 'role')
      .leftJoinAndMapOne(
        'user.avatar',
        Document,
        'avatar',
        'avatar.entityId = user.id AND avatar.entityType = :entityType  AND avatar.type = :docType',
        {
          entityType: EntityType.USER,
          docType: DocumentType.IMAGE,
        },
      )
      .where('org.id = :organisationId', { organisationId })
      .andWhere('user.status IN (:...status)', { status: status || [UserStatusType.ACTIVE, UserStatusType.SUSPENDED] })
      .andWhere('role.name in (:...roles)', { roles })
      .getMany();
  }

  async findAdmins() {
    return this.userRepository.find({
      relations: { userOrganisations: { role: true } },
      where: { status: UserStatusType.ACTIVE, userOrganisations: { role: { name: In([Role.ADMIN, Role.SUPER_ADMIN]) } } },
    });
  }

  async partnerBulkImport(
    partnerBulkImportUserDto: PartnerBulkImportUserDto[],
    initiator: CurrentUser,
    partnerOrganisationId: string,
    partnerOrgType: PartnerOrganisationType,
  ) {
    const bulkUsers = partnerBulkImportUserDto.map((u) => Object.assign(u, { ...u, email: u?.email?.toLocaleLowerCase() }));
    const roles = await this.roleService.findAll();
    const existingUsers = await this.userRepository.find({
      where: { email: In(bulkUsers.map((u) => u.email)) },
      relations: { userOrganisations: { role: true }, userPartnerOrganisations: true },
    });

    if (bulkUsers.length !== new Set(bulkUsers.map((u) => u.email)).size) {
      const admins = bulkUsers.filter((u) => u.isAdmin);
      if (admins.length) throw new VisionException('USER', 'Partner admin and Key contact email must be unique!');
      throw new VisionException('USER', 'Duplicate email found');
    }

    const qr = this.userRepository.manager.connection.createQueryRunner();

    const partnerOrganisation = await qr.manager.findOne(PartnerOrganisation, { where: { id: partnerOrganisationId } });
    for (const existingUser of existingUsers) {
      const incomingUser = bulkUsers.find((u) => u.email === existingUser.email);

      if (existingUser.status === UserStatusType.INACTIVE) {
        throw new VisionException('USER', `User ${existingUser.email} is offboarded from the platform`);
      }

      if (existingUser.userPartnerOrganisations.find((upo) => upo.partnerOrganisationId === partnerOrganisationId)) {
        throw new VisionException('USER', `User ${existingUser.email} already exists in the partner organisation`);
      }

      if (existingUser.affiliation === Affiliation.INTERNAL) {
        throw new VisionException('USER', `User ${existingUser.email} must be external to be added to a partner organisation`);
      }

      if (existingUser.userPartnerOrganisations.length) {
        throw new VisionException('USER', `User ${existingUser.email} already exists in other partner organisation`);
      }

      const u = existingUser.userOrganisations.find((uo) => uo.role.name.toString() !== partnerOrgType.toString());
      if (u && u.role.name !== Role.IPC) {
        throw new VisionException('USER', `User ${existingUser.email} cannot be added to a partner organisation with role ${u.role.name}`);
      }
      // if (existingUser.userOrganisations.find((uo) => uo.organisationId === INITIAL_ORGANISATION_ID)) {
      //   throw new VisionException('USER', `User ${existingUser.email} already exists in the system`);
      // }
      const existingUserRole = existingUser.userOrganisations.find((uo) => uo.organisationId === INITIAL_ORGANISATION_ID)?.role;
      const userOrgRelations = await this.userOrganisationService.createForOrganisation(
        existingUser,
        INITIAL_ORGANISATION_ID,
        existingUserRole || roles.find((r) => r.id === incomingUser.roleId),
        initiator.id,
      );

      for (const uo of userOrgRelations) {
        await qr.manager.save(UserOrganisation, { ...uo, loaAcceptedAt: new Date() });
      }

      await qr.manager.save(UserPartnerOrganisation, {
        userId: existingUser.id,
        partnerOrganisationId,
        isAdmin: incomingUser?.isAdmin || null,
        isKeyContact: incomingUser?.isKeycontact || null,
      });

      if (incomingUser.isAdmin) {
        // Validate that user must be onboarded (active) to be assigned as partner admin
        if (existingUser.status !== UserStatusType.ACTIVE && existingUser.status !== UserStatusType.SUSPENDED) {
          throw new BadRequestException(`User ${existingUser.email} must be onboarded to be assigned as partner administrator`);
        }

        // Validation ensures user is active/onboarded, send "congrats you are partner admin" email
        const registerLink = this.urlService.getFrontendUrl('/auth/login');
        await this.notificationService.send({
          to: existingUser,
          templateParams: {
            partnerName: partnerOrganisation.orgName,
            user: existingUser,
            register_link: registerLink,
          },
          type: 'PAR-03-existing-user-added-as-admin',
          instant: true,
        });
      }
    }

    const newUsers: PartnerBulkImportUserDto[] = bulkUsers
      .filter((u) => !existingUsers.find((eu) => eu.email === u.email))
      .map((user) => {
        const userRole = roles.find((role) => role.name.toString() === user.role.toString());
        if (!userRole) {
          throw new VisionException('USER', 'No role with name:' + user.role);
        }
        return {
          ...user,
          roleId: userRole.id,
          affiliation: Affiliation.EXTERNAL,
          invitedBy: initiator.id,
          acceptedTermsAndConditionVer: +process.env.TERMS_AND_CONDITIONS_VERSION || 1,
        };
      })
      .filter(Boolean);

    const savedUsers: User[] = [];
    const savedUserOrgs: UserOrganisation[] = [];
    let adminUser: User;
    await this.transaction(newUsers, qr, async () => {
      const cUser = newUsers.map((n) => ({
        isAdmin: n.isAdmin,
        isKeycontact: n.isKeycontact,
        email: n.email,
        roleId: n.roleId,
        role: roles.find((role) => role.id === n.roleId),
      }));

      newUsers.forEach((u) => delete u.roleId);
      savedUsers.push(...(await qr.manager.save(User, newUsers)));
      const userOrgRelations = savedUsers.map<DeepPartial<UserOrganisation>>((user) => ({
        userId: user.id,
        organisationId: INITIAL_ORGANISATION_ID,
        roleId: cUser.find((u) => u.email === user.email).roleId,
        role: cUser.find((u) => u.email === user.email).role,
        loaAcceptedAt: new Date(),
      }));
      savedUserOrgs.push(...(await qr.manager.save(UserOrganisation, userOrgRelations)));
      const partnerOrganisationRelation = savedUsers.map((user) => {
        const isAdmin = cUser.find((u) => u.email === user.email)?.isAdmin || null;
        if (isAdmin) adminUser = user;
        return {
          partnerOrganisationId,
          userId: user.id,
          isAdmin,
          isKeycontact: cUser.find((u) => u.email === user.email)?.isKeycontact || null,
        };
      });
      await qr.manager.save(UserPartnerOrganisation, partnerOrganisationRelation);
    });

    // await this.afterBulkUpload(savedUsers, INITIAL_ORGANISATION_ID, initiator);

    for (const savedUser of savedUsers) {
      const savedUo = savedUserOrgs.find((uo) => uo.organisationId === INITIAL_ORGANISATION_ID && uo.userId === savedUser.id);
      const role = roles.find((role) => role.id === savedUo.roleId) || roles.find((role) => role.name === savedUo.roleId);
      if ([Role.BROKER].includes(role.name)) {
        // await this.activateUser(Object.assign({ ...savedUser, userOrganisations: [savedUo] } as User, { role }), organisationId);
      }
    }

    if (adminUser) {
      await this.activatePartnerUser(adminUser, { partnerName: partnerOrganisation.orgName });
    }

    return savedUsers;
  }

  async findSuperAdmins() {
    return this.userRepository.find({
      relations: { userOrganisations: { role: true } },
      where: { status: UserStatusType.ACTIVE, userOrganisations: { role: { name: In([Role.SUPER_ADMIN]) } } },
    });
  }

  async bulkImport(bulkUsers: BulkImportUserDto[], organisationId: string, initiator: CurrentUser) {
    const roles = await this.roleService.findAll();
    const activatePartnerBrokers = [] as User[];
    const existingUsers = await this.userRepository.find({
      where: { email: In(bulkUsers.map((u) => u.email)) },
      relations: { userOrganisations: { role: true }, userPartnerOrganisations: { partnerOrganisation: true } },
    });

    const qr = this.userRepository.manager.connection.createQueryRunner();

    // Check if the organisation has reached the maximum number of users for each role
    const rolesToCheck: Role[] = Object.keys(this.roleConfig.roleConfigs) as Role[];
    for (const role of rolesToCheck) {
      if (bulkUsers.some((u) => u.role === (role as unknown as RoleBulkUpload))) {
        const users = [
          ...(await this.findByRoleInOrganisation(organisationId, [role], [UserStatusType.ACTIVE, UserStatusType.PENDING, UserStatusType.SUSPENDED])),
          ...bulkUsers.filter((u) => u.role === (role as unknown as RoleBulkUpload)),
        ];
        if (
          this.roleConfig.roleConfigs[role].organisationMax !== null &&
          users.length > 0 &&
          users.length > +this.roleConfig.roleConfigs[role].organisationMax
        ) {
          throw new VisionException(
            'USER',
            `An organisation cannot have more than ${this.roleConfig.roleConfigs[role].organisationMax} ${role.replace('_', ' ')} user`,
          );
        }
      }
    }

    const existingUsersInPartnerOrg = existingUsers.filter((u) => u.userPartnerOrganisations.length);

    if (existingUsersInPartnerOrg.length) {
      existingUsersInPartnerOrg.forEach((u) => {
        u.externalOrganisationName = u.userPartnerOrganisations[0].partnerOrganisation.orgName;
        u.affiliation = Affiliation.EXTERNAL;
      });
      await qr.manager.save(User, existingUsersInPartnerOrg);
    }

    const findExistingUsersLastInvites = await this.notificationService.getLastInviteByUsers(
      existingUsers.map((eu) => eu.id),
      organisationId,
    );
    // A user can have only one role in the platform
    for (const existingUser of existingUsers) {
      const incomingUser = bulkUsers.find((u) => u.email === existingUser.email);
      const currentRoles = existingUser.userOrganisations.map((uo) => uo.role);

      if (
        currentRoles &&
        incomingUser.role.toString() !== Role.IPC &&
        !currentRoles.filter((f) => f.name !== Role.IPC).every((e) => e.name === incomingUser.role.toString())
      ) {
        throw new VisionException('USER', `User ${existingUser.email} already exists in the platform with another role`);
      }

      if (existingUser.userOrganisations.find((uo) => uo.organisationId === organisationId)) {
        throw new VisionException('USER', `User ${existingUser.email} already exists in the organisation`);
      }

      const existingUserRole = await qr.manager.findOne(RoleEntity, { where: { name: incomingUser.role as unknown as Role } });
      const userOrgRelations = await this.userOrganisationService.createForOrganisation(existingUser, organisationId, existingUserRole, initiator.id);
      await qr.manager.save(UserOrganisation, userOrgRelations);

      if (incomingUser.role.toString() === Role.BROKER) {
        const findBrokerActivationEmail = findExistingUsersLastInvites.find((u) => u.recipientUser.id === existingUser.id);
        if (!findBrokerActivationEmail && existingUser.userPartnerOrganisations.length) {
          activatePartnerBrokers.push(existingUser);
        }
      }

      this.userEventService.create({
        organisationId,
        entityType: EntityType.USER,
        type: UserEventType.USER_BULK_IMPORT,
        newValue: bulkUsers,
      });
    }

    // Set initial first steps for every user
    const newUsers: CreateUserDto[] = bulkUsers
      .filter((u) => !existingUsers.find((eu) => eu.email === u.email))
      .map((user) => {
        const userRole = roles.find((role) => role.name.toString() === user.role.toString());
        if (!userRole) {
          throw new VisionException('USER', 'No role with name:' + user.role);
        }
        return {
          ...user,
          roleId: userRole.id,
          invitedBy: initiator.id,
          firstStepsState: this.setFirstStepsState(user.role.toString()),
          acceptedTermsAndConditionVer: +process.env.TERMS_AND_CONDITIONS_VERSION || 1,
        };
      })
      .filter(Boolean);

    const savedUsers: User[] = [];
    const savedUserOrgs: UserOrganisation[] = [];
    await this.transaction(newUsers, qr, async () => {
      const cUser = newUsers.map((n) => ({ email: n.email, roleId: n.roleId, role: roles.find((role) => role.id === n.roleId) }));
      newUsers.forEach((u) => delete u.roleId);
      savedUsers.push(...(await qr.manager.save(User, newUsers)));
      const userOrgRelations = savedUsers.map<DeepPartial<UserOrganisation>>((user) => ({
        userId: user.id,
        invitedByUserId: initiator.id,
        organisationId,
        roleId: cUser.find((u) => u.email === user.email).roleId,
        role: cUser.find((u) => u.email === user.email).role,
      }));
      savedUserOrgs.push(...(await qr.manager.save(UserOrganisation, userOrgRelations)));
    });

    await this.afterBulkUpload(savedUsers, organisationId, initiator);

    // TODO: should be handled by event/message subscriber
    for (const savedUser of savedUsers) {
      const savedUo = savedUserOrgs.find((uo) => uo.organisationId === organisationId && uo.userId === savedUser.id);
      const role = roles.find((role) => role.id === savedUo.roleId) || roles.find((role) => role.name === savedUo.roleId);

      if (
        [Role.MAC, Role.MAC_DELEGATE, Role.BROKER, Role.HEAD_OFFICE, Role.ADMIN, Role.SUPER_ADMIN, Role.INVESTMENT_FUND_MANAGER].includes(role.name)
      ) {
        await this.activateUser(Object.assign({ ...savedUser, userOrganisations: [savedUo] } as User, { role }), organisationId);
      }

      if ([Role.IPC].includes(role.name)) {
        const organisation = await this.organisationRepository.findOneBy({ id: organisationId });

        await this.activateUser(Object.assign({ ...savedUser, userOrganisations: [savedUo] } as User, { role }), organisationId, null, {
          orgName: organisation.name,
          macName: `${initiator?.firstName} ${initiator.lastName}`,
        });
      }
    }

    for (const broker of activatePartnerBrokers) {
      await this.activateUser(broker, organisationId);
    }

    return savedUsers;
  }

  async afterBulkUpload(savedUsers: User[], organisationId: string, initiator?: CurrentUser) {
    if ((initiator && initiator.role.name === Role.MAC) || (initiator && initiator.role.name === Role.MAC_DELEGATE)) {
      if (!initiator.firstStepsState || !initiator.firstStepsState.addUsers) {
        const admins = await this.findAdmins();
        const recipients: User[] = [...admins];
        if (initiator.role.name === Role.MAC_DELEGATE) {
          const mac = await this.findByRoleInOrganisation(organisationId, [Role.MAC]);
          recipients.push(...mac);
        }
        await this.notificationService.send({
          type: 'FS-01-macd-first-bulk-upload',
          to: recipients,
          templateParams: {
            count: savedUsers.length,
          },
          organisationId,
        });
      }
    }
  }

  setFirstStepsState(roleName: string): FirstStepsDto {
    switch (roleName) {
      case Role.MAC:
        return macFirstStepsDefaultValues;
      case Role.MAC_DELEGATE:
        return macDelegateFirstStepsDefaultValues;
      case Role.PAC:
        return pacFirstStepsDefaultValues;
      case Role.SAC:
        return sacFirstStepsDefaultValues;
      case Role.BROKER:
        return brokerFirstStepsDefaultValues;
      case Role.INSURER:
        return insurerFirstStepsDefaultValues;
      default:
        return null;
    }
  }

  async findInvitedNotLoggedinUsersByInviters() {
    const data = (await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.userOrganisations', 'uo')
      .andWhere('user.status IN (:...status)', { status: [UserStatusType.ACTIVE, UserStatusType.SUSPENDED] })
      .leftJoinAndMapMany(
        'user.inviteUsers',
        User,
        'inviteds',
        'inviteds.invitedBy = user.id AND inviteds.lastLogin IS NULL AND inviteds.status = :pending',
        {
          pending: UserStatusType.PENDING,
        },
      )
      .innerJoin(
        User,
        'i',
        `i.invitedBy = user.id AND i.lastLogin IS NULL AND i.status = :pending AND DATE(i.created) = CURRENT_DATE - INTERVAL '5 days'`,
        {
          pending: UserStatusType.PENDING,
        },
      )
      .getMany()) as (User & { inviteUsers: User[] })[];

    const users = data.reduce((acc, v) => {
      v.userOrganisations.forEach((uo) => {
        if (!acc.has(uo)) {
          acc.set(uo, { uo, recipients: [], invitedNotLoggedinUsers: [] });
        }

        const orgData = acc.get(uo);
        orgData.invitedNotLoggedinUsers.push(...v.inviteUsers);
        orgData.recipients.push(v);
      });
      return acc;
    }, new Map<UserOrganisation, { uo: UserOrganisation; recipients: User[]; invitedNotLoggedinUsers: User[] }>());

    return users;
  }

  async createPartnerOrganisationUser(
    createPartnerOrgUserDto: CreatePartnerOrgUserDto,
    currentUser: CurrentUser,
    partnerOrganisation: PartnerOrganisation,
  ) {
    const role = await this.roleService.get(createPartnerOrgUserDto.roleId);
    if (![Role.INSURER, Role.BROKER].includes(role.name)) {
      throw new VisionException('USER', `Admins cannot create user with role ${role.name}`);
    }
    const userPartnerOrganisations = partnerOrganisation.userPartnerOrganisations;
    const queryRunner = this.userRepository.manager.connection.createQueryRunner();
    let userCreated = false;

    const created: User = await this.transaction(
      createPartnerOrgUserDto,
      queryRunner,
      async (createPartnerOrgUserDto: CreatePartnerOrgUserDto & { id?: string }) => {
        let user = await queryRunner.manager.findOne(User, {
          where: { email: ILike(createPartnerOrgUserDto.email) },
          relations: { userOrganisations: { role: true }, userPartnerOrganisations: { partnerOrganisation: true } },
        });

        this.logger.debug('Create user: ' + createPartnerOrgUserDto.email + ' / ' + role.name + ' / ' + INITIAL_ORGANISATION_ID);
        if (user) {
          if (user.userPartnerOrganisations.length) {
            throw new VisionException('USER', 'User already exists in other partner organisation');
          }

          if (createPartnerOrgUserDto.isAdmin && userPartnerOrganisations.some((upo) => upo.isAdmin)) {
            throw new VisionException('PARTNER_ORGANISATION', 'Partner Organisation already has admin user');
          }

          if (createPartnerOrgUserDto.isKeycontact && userPartnerOrganisations.some((upo) => upo.isKeycontact)) {
            throw new VisionException('PARTNER_ORGANISATION', 'Partner Organisation already has key contact');
          }

          if (user.affiliation === Affiliation.INTERNAL) {
            throw new VisionException('USER', 'User must be external to be added to a partner organisation');
          }

          if (user.userPartnerOrganisations.find((upo) => upo.partnerOrganisationId === partnerOrganisation.id)) {
            throw new VisionException('USER', 'User already exists in the partner organisation');
          }

          const u = user.userOrganisations.find((uo) => uo.role.name.toString() !== partnerOrganisation.type.toString());
          if (u && u.role.name !== Role.IPC) {
            throw new VisionException('USER', `User ${user.email} cannot be added to a partner organisation with role ${u.role.name}`);
          }

          await queryRunner.manager.update(User, user.id, { externalOrganisationName: partnerOrganisation.orgName });
          const initOrg = await this.userOrganisationService.createForOrganisation(user, INITIAL_ORGANISATION_ID, role, currentUser.id);
          await queryRunner.manager.save(UserOrganisation, initOrg);
        }
        if (!user) {
          await queryRunner.manager.save(User, {
            ...createPartnerOrgUserDto,
            affiliation: Affiliation.EXTERNAL,
            externalOrganisationName: partnerOrganisation.orgName,
            acceptedTermsAndConditionVer: +process.env.TERMS_AND_CONDITIONS_VERSION || 1,
          });
          userCreated = true;
          user = await queryRunner.manager.findOne(User, {
            where: { email: createPartnerOrgUserDto.email },
            relations: { userOrganisations: { role: true }, userPartnerOrganisations: { partnerOrganisation: true } },
          });

          const userOrganisation = (
            await this.userOrganisationService.createForOrganisation(user, INITIAL_ORGANISATION_ID, role, currentUser.id)
          ).find((uo) => uo.organisationId === INITIAL_ORGANISATION_ID);

          user.invitedBy = currentUser.id;

          await queryRunner.manager.save(UserOrganisation, { ...userOrganisation, loaAcceptedAt: new Date() });
          await queryRunner.manager.update(User, user.id, {
            invitedBy: user.invitedBy,
          });

          if (createPartnerOrgUserDto?.avatar?.id) {
            await queryRunner.manager.save(Document, {
              ...createPartnerOrgUserDto.avatar,
              entityId: user.id,
              entityType: EntityType.USER,
              type: DocumentType.IMAGE,
            });
          }

          delete createPartnerOrgUserDto.avatar;
        }

        await queryRunner.manager.save(UserPartnerOrganisation, {
          userId: user.id,
          partnerOrganisationId: partnerOrganisation.id,
          isAdmin: createPartnerOrgUserDto.isAdmin,
          isKeycontact: createPartnerOrgUserDto.isKeycontact,
        });
        
        // Update first steps for partner admins
        if (createPartnerOrgUserDto.isAdmin && userCreated) {
          const userOrganisation = user.userOrganisations.find((uo) => uo.organisationId === INITIAL_ORGANISATION_ID);
          if (userOrganisation) {
            userOrganisation.firstStepsState = this.setFirstStepsState(role.name);
            await queryRunner.manager.save(UserOrganisation, userOrganisation);
          }
        }
        
        return user;
      },
    );

    // Send appropriate email notifications
    if (createPartnerOrgUserDto.isAdmin) {
      // Validate that user must be onboarded (active) to be assigned as partner admin
      if (!userCreated && created.status !== UserStatusType.ACTIVE && created.status !== UserStatusType.SUSPENDED) {
        throw new BadRequestException('User must be onboarded to be assigned as partner administrator');
      }

      // Admin users get partner admin notification
      if (!userCreated) {
        // Existing user added as admin - validation ensures they're active/onboarded, send "congrats" email
        const registerLink = this.urlService.getFrontendUrl('/auth/login');
      await this.notificationService.send({
        to: created,
        templateParams: {
          partnerName: partnerOrganisation.orgName,
          user: created,
            register_link: registerLink,
        },
        type: 'PAR-03-existing-user-added-as-admin',
          instant: true,
      });
      } else {
        // New user added as admin - send registration email
        await this.activatePartnerUser(created, { partnerName: partnerOrganisation.orgName });
      }
    } else {
      // Regular members get role-based invite email
      if (userCreated) {
        // New member - send invite email
        await this.activateUser(created, INITIAL_ORGANISATION_ID, undefined, {
          orgName: partnerOrganisation.orgName,
        });
      } else {
        // Existing user added as member - send notification if they're pending
        if (created.status === UserStatusType.PENDING) {
          const activationToken = await this.generateActivationToken(created);
          if (activationToken) {
            const userRole = created.userOrganisations.find((uo) => uo.organisationId === INITIAL_ORGANISATION_ID)?.role;
            const inviteTemplate = userRole ? this.getRoleTemplateMap()[userRole.name] : 'USER-03-invite-broker';
            await this.notificationService.send({
              to: created,
              templateParams: {
                register_link: `${this.appConfig.client.url}/activate?token=${activationToken}`,
                user: created,
                orgName: partnerOrganisation.orgName,
              },
              type: inviteTemplate,
              organisationId: INITIAL_ORGANISATION_ID,
              instant: true,
            });
          }
        }
      }
    }

    return created;
  }

  async createUser(createUserDto: CreateUserDto, organisationId: string, activate: boolean | null, currentUser: CurrentUser) {
    let externalLoaDocument: Document;
    let orgMacs: User[];

    const role = await this.roleService.get(createUserDto.roleId);
    let activatePartnerBroker: User;

    if ([Role.ADMIN, Role.SUPER_ADMIN].includes(role.name) && currentUser.ability.cannot(userPermissions.admins.manage, EntityType.USER)) {
      throw new VisionException('USER', `Admins cannot create user with role ${role.name}`);
    }

    const queryRunner = this.userRepository.manager.connection.createQueryRunner();
    let userCreated = false;
    const created: User = await this.transaction(createUserDto, queryRunner, async (createUserDto: CreateUserDto & { id?: string }) => {
      let user = await queryRunner.manager.findOne(User, {
        where: { email: createUserDto.email },
        relations: { userOrganisations: { role: true }, userPartnerOrganisations: { partnerOrganisation: true } },
      });

      this.logger.debug('Create user: ' + createUserDto.email + ' / ' + role.name + ' / ' + organisationId);
      if (user) {
        // existing / new user role mismatch
        const currentRoles = user.userOrganisations.map((uo) => uo.role);
        if (currentRoles && role.name !== Role.IPC && !currentRoles.filter((f) => f.name !== Role.IPC).every((e) => e.id === createUserDto.roleId)) {
          throw new VisionException('USER', 'User already exists in the platform with another role');
        }

        if (user.userOrganisations.find((uo) => uo.organisationId === organisationId)) {
          throw new VisionException('USER', 'User already exists in the organisation');
        }

        if (role.name === Role.BROKER) {
          const findBrokerActivationEmail = await this.notificationService.getUserInvite(user.id);
          if (!findBrokerActivationEmail && user.userPartnerOrganisations.length && !user.userPartnerOrganisations[0].isAdmin) {
            activatePartnerBroker = user;
          }
        }

        if (createUserDto?.affiliation === Affiliation.EXTERNAL && createUserDto.loatype === LoaType.LOA_GENERATED) {
          const orgMac =
            currentUser?.role.name === Role.MAC
              ? currentUser
              : (await this.findByRoleInOrganisation(currentUser?.currentOrganisationId, [Role.MAC]))?.[0];

          if (!orgMac) {
            throw new VisionException('USER', 'Error generating LOA document. MAC not found');
          }

          const uploadedDocument = await this.generateLoaDocument(currentUser, {
            ...createUserDto,
            firstName: orgMac.firstName,
            lastName: orgMac.lastName,
          });
          await queryRunner.manager.save(Document, {
            ...uploadedDocument,
            entityId: user.id,
            entityType: EntityType.USER,
            type: DocumentType.LETTER_OF_AUTHORITY_GENERATED,
            organisationId,
            name: uploadedDocument.filename,
            scanStatus: ScanStatus.CLEAN,
          });
        } else if (createUserDto?.loadoc?.id) {
          await queryRunner.manager.save(Document, {
            ...createUserDto.loadoc,
            entityId: user.id,
            entityType: EntityType.USER,
            type: DocumentType.LETTER_OF_AUTHORITY,
            organisationId,
          });
        }
      }

      // Validate number of active roles per organisation
      if (this.roleConfig.roleConfigs.hasOwnProperty(role.name) && this.roleConfig.roleConfigs[role.name].organisationMax !== null) {
        const maxAllowedUsers = +this.roleConfig.roleConfigs[role.name].organisationMax;
        const users = await this.findByRoleInOrganisation(
          organisationId,
          [role.name],
          [UserStatusType.ACTIVE, UserStatusType.PENDING, UserStatusType.SUSPENDED],
        );
        const validUser = users.length === 0 || (users.length > 0 && +this.roleConfig.roleConfigs[role.name].organisationMax > users.length);

        if (!validUser) {
          throw new VisionException(
            'USER',
            `Organisation already has ${maxAllowedUsers} ${role.name.replace('_', ' ')} user${maxAllowedUsers > 1 ? 's' : ''}`,
          );
        }
      }

      if (!activatePartnerBroker && user && role.name === Role.BROKER) {
        const template = this.getRoleTemplateMap()[role.name];
        const attachments: Document[] = [];
        // Have to attach LOA doc to invite
        const loa = await queryRunner.manager.findOne(Document, {
          where: { entityId: user.id, entityType: EntityType.USER, type: DocumentType.LETTER_OF_AUTHORITY, organisationId },
        });
        if (loa) {
          attachments.push(loa);
        }

        await this.notificationService.send({
          to: user,
          templateParams: {
            register_link: null,
            user,
          },
          type: template,
          instant: true,
          attachments,
          organisationId,
        });
      }

      if (user && role.name === Role.IPC) {
        // Notification for existing IPC users if they are invited by to a new organisation
        const organisation = await this.organisationRepository.findOneBy({ id: organisationId });

        await this.notificationService.send({
          type: 'INC-03-invite-existing-user',
          to: user,
          templateParams: {
            orgName: organisation.name,
            macName: `${currentUser.firstName} ${currentUser.lastName}`,
          },
          subjectOverride: `You’ve been assigned as an Incident Protocol Contact for ${organisation.name}`,
          instant: true,
          organisationId,
        });
      }

      if (!user) {
        await queryRunner.manager.save(User, {
          ...createUserDto,
          acceptedTermsAndConditionVer: +process.env.TERMS_AND_CONDITIONS_VERSION || 1,
        });
        userCreated = true;
        user = await queryRunner.manager.findOne(User, {
          where: { email: createUserDto.email },
          relations: { userOrganisations: { role: true }, userPartnerOrganisations: { partnerOrganisation: true } },
        });

        if (createUserDto?.affiliation === Affiliation.EXTERNAL && createUserDto.loatype === LoaType.LOA_GENERATED) {
          orgMacs =
            currentUser?.role.name === Role.MAC ? [currentUser] : await this.findByRoleInOrganisation(currentUser?.currentOrganisationId, [Role.MAC]);

          if (!orgMacs.length) {
            throw new VisionException('USER', 'Error generating LOA document. MAC not found');
          }

          const uploadedDocument = await this.generateLoaDocument(currentUser, {
            ...createUserDto,
            firstName: orgMacs[0].firstName,
            lastName: orgMacs[0].lastName,
          });
          externalLoaDocument = await queryRunner.manager.save(Document, {
            ...uploadedDocument,
            entityId: user.id,
            entityType: EntityType.USER,
            type: DocumentType.LETTER_OF_AUTHORITY_GENERATED,
            organisationId,
            name: uploadedDocument.filename,
            scanStatus: ScanStatus.CLEAN,
          });
        } else if (createUserDto?.loadoc?.id) {
          await queryRunner.manager.save(Document, {
            ...createUserDto.loadoc,
            entityId: user.id,
            entityType: EntityType.USER,
            type: DocumentType.LETTER_OF_AUTHORITY,
            organisationId,
          });
        }

        const userOrganisation = (await this.userOrganisationService.createForOrganisation(user, organisationId, role, currentUser.id)).find(
          (uo) => uo.organisationId === organisationId,
        );

        userOrganisation.firstStepsState = this.setFirstStepsState(role.name);

        user.invitedBy = currentUser.id;

        await queryRunner.manager.save(UserOrganisation, userOrganisation);

        await queryRunner.manager.update(User, user.id, {
          invitedBy: user.invitedBy,
        });

        if (createUserDto?.avatar?.id) {
          await queryRunner.manager.save(Document, {
            ...createUserDto.avatar,
            entityId: user.id,
            entityType: EntityType.USER,
            type: DocumentType.IMAGE,
          });
        }

        if (user.userPartnerOrganisations.length && [Role.BROKER, Role.INSURER].includes(role.name)) {
          await queryRunner.manager.update(User, user.id, {
            externalOrganisationName: user.userPartnerOrganisations[0].partnerOrganisation.orgName,
            affiliation: Affiliation.EXTERNAL,
          });
        }

        delete createUserDto.avatar;
        delete createUserDto.loadoc;
      }

      const userOrgRelationsWithoutRole = await this.userOrganisationService.createForOrganisation(user, organisationId, role, currentUser.id);
      const userOrgRelations = userOrgRelationsWithoutRole.map((uo) => {
        return Object.assign(uo, { ...uo, role });
      });

      if (userOrgRelations.length === 1) {
        await queryRunner.manager.save(UserOrganisation, { ...userOrgRelations[0], firstStepsState: this.setFirstStepsState(role.name) });
      } else {
        const userOrgsWithFriststeps = userOrgRelations.map((uo) => ({ ...uo, firstStepsState: this.setFirstStepsState(role.name) }));
        await queryRunner.manager.save(UserOrganisation, userOrgsWithFriststeps);
      }
      if (user?.userPartnerOrganisations?.[0]?.partnerOrganisation) {
        const partner = user.userPartnerOrganisations[0].partnerOrganisation;
        await queryRunner.manager.update(User, user.id, {
          affiliation: Affiliation.EXTERNAL,
          phone: createUserDto.phone,
          positionTitle: createUserDto.positionTitle,
          externalOrganisationName: partner.orgName,
        });
      }

      user.userOrganisations = userOrgRelations;

      return user;
    });

    if (userCreated) {
      const userWithOrg = await this.userRepository.findOne({ where: { id: created.id }, relations: { userOrganisations: { role: true } } });
      if (role.name === Role.IPC) {
        const organisation = await this.organisationRepository.findOneBy({ id: organisationId });
        await this.activateUser(userWithOrg, organisationId, null, {
          orgName: organisation.name,
          macName: `${currentUser.firstName} ${currentUser.lastName}`,
        });
      }
      if (activate || [Role.MAC, Role.MAC_DELEGATE, Role.BROKER, Role.ADMIN, Role.SUPER_ADMIN, Role.INVESTMENT_FUND_MANAGER].includes(role.name)) {
        await this.activateUser(userWithOrg, organisationId);
      }
    }
    if (activatePartnerBroker) {
      this.activateUser(activatePartnerBroker, organisationId);
    }

    if (externalLoaDocument?.id) {
      for (const mac of orgMacs) {
        await this.notificationService.send({
          to: mac,
          templateParams: {
            name: `${mac.firstName} ${mac.lastName}`,
            brokerName: `${createUserDto.firstName} ${createUserDto.lastName}`,
          },
          subjectOverride: `A Letter of Authority has been generated for ${createUserDto.firstName} ${createUserDto.lastName}`,
          type: 'US-02-auto-generating-loa',
          attachments: [externalLoaDocument],
          organisationId,
        });
      }
    }

    return created;
  }

  async seedUserBulk(users: CreateUserDto[]) {
    for (const user of users) {
      await this.seedUser(user);
    }
  }

  async seedUser(createUserDto: CreateUserDto & { password?: string }): Promise<User> {
    const queryRunner = this.userRepository.manager.connection.createQueryRunner();

    return this.transaction(createUserDto, queryRunner, async (createUserDto: CreateUserDto & { password?: string; id?: string }) => {
      const hashed = await hash(createUserDto.password, this.authenticationConfig.bcryptRounds);
      await queryRunner.manager.save(User, { ...createUserDto, password: hashed });
      return queryRunner.manager.findOne(User, { where: { email: createUserDto.email }, relations: { userOrganisations: { role: true } } });
    });
  }

  async generateLoaDocument(currentUser: Partial<CurrentUser>, createUserDto: Partial<CreateUserDto>, macUser?: User) {
    const user = macUser || (await this.findOne(currentUser.id, { organisationId: currentUser.currentOrganisationId }));
    const userToken = this.authorizationService.createToken('a9b453d0-1ea3-4c5e-9b39-b1435859deb1', {
      id: user.id,
      email: user.email,
      lastName: user.lastName,
      firstName: user.firstName,
    });

    const date = new Date();
    const currentFormattedDate = date.toISOString();
    const filename = `${uuidv4()}.pdf`;
    const storagePath = `organisations/${currentUser.currentOrganisationId}/generated-loas/${filename}`;
    const existingUserWithPartner = await this.userRepository.findOne({
      where: { email: createUserDto.email },
      relations: { userPartnerOrganisations: { partnerOrganisation: true } },
    });

    const payload: PdfExportRequest = {
      url: this.urlService.getFrontendUrl('/internal-export/generated-loa', {
        token: userToken,
        organisationId: currentUser.currentOrganisationId,
        policyType: createUserDto.policyType,
        organisationName: currentUser.currentOrganisation.name,
        organisationAddress: formatAddress(currentUser.currentOrganisation.address),
        externalOrganisationAddress: existingUserWithPartner?.userPartnerOrganisations?.[0]
          ? formatAddress(existingUserWithPartner.userPartnerOrganisations[0].partnerOrganisation.hoAddress)
          : '',
        externalOrganisationName: createUserDto.externalOrganisationName,
        created: currentFormattedDate,
        name: `${createUserDto.firstName} ${createUserDto.lastName}`,
        logoId: currentUser.currentOrganisation.logo.id,
      }),
      storagePath,
    };

    const r = this.pdfExporter.send<PdfExportResponse>(Messages.PdfExport, payload).pipe(timeout(10000));
    const status = await firstValueFrom(r);

    if (!status.success) {
      throw new VisionException('USER', 'Failed to generate LOA');
    }

    return {
      storagePath,
      filename,
      mimeType: 'application/pdf',
      size: status.size,
    };
  }

  getRoleTemplateMap(): Record<Role, NotificationType> {
    return {
      [Role.SUPER_ADMIN]: 'USER-01-activate-user',
      [Role.ADMIN]: 'USER-01-activate-user',
      [Role.MAC]: 'USER-09-invite-mac',
      [Role.MAC_DELEGATE]: 'USER-10-invite-macd',
      [Role.SAC]: 'USER-04-invite-sac',
      [Role.PAC]: 'USER-05-invite-pac',
      [Role.BROKER]: 'USER-03-invite-broker',
      [Role.INSURER]: 'USER-13-invite-insurer',
      [Role.INVESTMENT_FUND_MANAGER]: 'USER-11-invite-if-manager',
      [Role.HEAD_OFFICE]: 'USER-12-invite-head-office',
      [Role.IPC]: 'INC-04-invite-ipc',
    };
  }

  //IMPORTANT: Updating token logic might affect resend invite functionality
  async activatePartnerUser(user: User, templateParams?: Record<string, any>, template?: NotificationType) {
    // Check if user has already been notified to activate
    const userByToken = await this.findTokenByUserIdTokenType(user.id, UserTokenType.ACTIVATE);

    if (userByToken) {
      return;
    }
    let type: NotificationType = 'PAR-04-new-user-added-as-admin';
    if (template) {
      type = template;
    }

    const token = this.generateToken();

    await this.deleteTokenType(user.id, UserTokenType.ACTIVATE);
    await this.saveToken(user.id, token, UserTokenType.ACTIVATE, this.authenticationConfig.tokens.activation.expiresIn);

    // Ensure required template params are present for PAR-03 and PAR-04 templates
    const finalTemplateParams: Record<string, any> = {
        ...templateParams,
        register_link: `${this.appConfig.client.url}/activate?token=${token}`,
        user,
    };

    // Validate required params for partner admin templates
    if ((type === 'PAR-03-existing-user-added-as-admin' || type === 'PAR-04-new-user-added-as-admin') && !('partnerName' in finalTemplateParams)) {
      this.logger.warn(`Missing partnerName for ${type} notification to user ${user.email}. Email may not render correctly.`);
    }

    await this.notificationService.send({
      to: user,
      templateParams: finalTemplateParams,
      type,
      organisationId: INITIAL_ORGANISATION_ID,
      instant: true,
    });
  }

  async generateActivationToken(user: User) {
    // Check if user has already been notified to activate
    const userByToken = await this.findTokenByUserIdTokenType(user.id, UserTokenType.ACTIVATE);

    if (userByToken) {
      return;
    }
    const token = this.generateToken();
    await this.deleteTokenType(user.id, UserTokenType.ACTIVATE);
    await this.saveToken(user.id, token, UserTokenType.ACTIVATE, this.authenticationConfig.tokens.activation.expiresIn);

    return token;
  }

  //IMPORTANT: Updating token logic might affect resend invite functionality
  async activateUser(user: User, organisationId: string, userAssignType?: AssignUserType, templateParams?: Record<string, any>) {
    const refreshUser = await this.userRepository.findOne({
      where: { id: user.id },
      relations: { userOrganisations: { role: true } },
    });
    const activationToken = await this.generateActivationToken(refreshUser);
    if (!activationToken) {
      return;
    }

    const userRole = refreshUser.userOrganisations.find((uo) => uo.organisationId === organisationId).role;
    let template: NotificationType = this.getRoleTemplateMap()[userRole.name];
    if (userAssignType === AssignUserType.LEAD_INSURER) {
      template = 'USER-07-invite-lead-insurer';
    } else if (userAssignType === AssignUserType.CO_INSURER) {
      template = 'USER-08-invite-co-insurer';
    } else if (userAssignType === AssignUserType.WHOLESALE_INSURER) {
      template = 'USER-17-invite-wholesale-insurer';
    }

    let subject: string;

    if (template === 'USER-13-invite-insurer') {
      const policyType = templateParams?.policyType ? ` ${toTitleCase(templateParams.policyType)}` : '';
      const expireDate = templateParams?.expireDate ? ` until ${templateParams.expireDate}` : '';
      subject = `Register for exclusive viewing – You're invited to explore ${templateParams?.orgName || ''}${policyType} Policy available${expireDate}`;
    }

    if (template === 'INC-04-invite-ipc') {
      subject = `You have been nominated by ${templateParams?.orgName} as an incident protocol contact`;
    }

    const attachments: Document[] = [];
    if (userRole.name === Role.BROKER) {
      // Have to attach LOA doc to invite
      const loa = await this.documentService.findByOptions({
        where: {
          entityId: refreshUser.id,
          entityType: EntityType.USER,
          type: In([DocumentType.LETTER_OF_AUTHORITY, DocumentType.LETTER_OF_AUTHORITY_GENERATED]),
          organisationId,
        },
      });

      if (loa) {
        attachments.push(loa);
      }
    }

    await this.notificationService.send({
      to: refreshUser,
      templateParams: {
        ...templateParams,
        register_link: `${this.appConfig.client.url}/activate?token=${activationToken}`,
        user: refreshUser,
      },
      type: template,
      subjectOverride: subject,
      instant: true,
      attachments,
      organisationId,
    });
  }

  async reinstate(user: User, organisationId: string | null = null, isPartnerOrgReinstate = false) {
    if (organisationId) {
      const userOrgStatus = user.userOrganisations.find((org) => org.organisationId === organisationId)?.userStatus;
      if (userOrgStatus !== UserOrganisationStatus.INACTIVE) return { error: 'User is not inactive in the organisation' };
    } else {
      user.status !== UserStatusType.INACTIVE && { error: 'User is not inactive' };
    }

    const toUserStatus = user.password ? UserStatusType.ACTIVE : UserStatusType.PENDING;

    const queryRunner = this.userRepository.manager.connection.createQueryRunner();
    await this.transaction(null, queryRunner, async () => {
      await queryRunner.manager.update(User, { id: user.id }, { status: toUserStatus });
      if (organisationId) {
        if (user?.userPartnerOrganisations?.length) {
          await queryRunner.manager.update(
            UserOrganisation,
            { userId: user.id, organisationId: INITIAL_ORGANISATION_ID },
            { userStatus: UserOrganisationStatus.ACTIVE },
          );
        }
        await queryRunner.manager.update(UserOrganisation, { userId: user.id, organisationId }, { userStatus: UserOrganisationStatus.ACTIVE });
        const assets = await queryRunner.manager.find(Asset, { select: { id: true }, where: { organisationId } });
        await queryRunner.manager.softDelete(UserAsset, { userId: user.id, assetId: In(assets.map((asset) => asset.id)) });
      } else if (!isPartnerOrgReinstate) {
        await queryRunner.manager.update(UserOrganisation, { userId: user.id }, { userStatus: UserOrganisationStatus.ACTIVE });
        await queryRunner.manager.softDelete(UserAsset, { userId: user.id });
      }
    });

    await this.notificationService.send({
      to: user,
      type: 'REI-01-reinstate-user',
      templateParams: {},
      instant: true,
      organisationId,
    });

    return { error: null };
  }

  async removeAvatar(user: UserCompleteDto) {
    this.documentService.remove(user.avatar);
    this.documentService.removeFromStorageByPrefix(user.avatar.storagePath);
  }

  isCompleteUser(user: User | UserCompleteDto): user is UserCompleteDto {
    if ('avatar' in user || 'assets' in user) return true;
  }

  async updateMeta(ids: string[], meta: UserMetaData) {
    return this.userRepository.update(ids, { meta: { notifiedFirstStepsUserInvite: meta.notifiedFirstStepsUserInvite } });
  }

  async updateSuspendStatus(id: string, suspend: boolean) {
    const user = await this.userRepository.findOne({ where: { id } });
    await this.userRepository.update(id, { status: suspend ? UserStatusType.SUSPENDED : UserStatusType.ACTIVE });
    if (suspend) {
      await this.notificationService.send({
        to: user,
        type: 'SUS-01-user-suspended',
        templateParams: {},
        instant: true,
      });
    } else {
      await this.notificationService.send({
        to: user,
        type: 'SUS-02-user-unsuspended',
        templateParams: {},
        instant: true,
      });
    }
  }

  async updateMember(id: string, updateUserDto: UpdateUserDto) {
    const queryRunner = this.userRepository.manager.connection.createQueryRunner();
    await this.transaction(updateUserDto, queryRunner, async (updateUserDto: UpdateUserDto) => {
      try {
        const user = await this.userRepository.findOne({ where: { id } });
        if (updateUserDto?.avatar?.id) {
          await queryRunner.manager.save(Document, {
            ...updateUserDto.avatar,
            entityId: user.id,
            entityType: EntityType.USER,
            type: DocumentType.IMAGE,
          });
        }

        delete updateUserDto.avatar;
        delete updateUserDto.loadoc;
        delete updateUserDto.loaaccept;
        delete updateUserDto.roleId;

        await queryRunner.manager.update(User, id, updateUserDto);
      } catch (e) {
        console.log(e);
        throw new BadRequestException(e);
      }
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto, currentUser?: CurrentUser, partnerOrganisationId?: string) {
    let orgMacs: User[];
    let externalLoaDocument: Document;
    let updatedUploadedLoaDocument: Document;

    const user = await this.findOne(id, { organisationId: currentUser?.currentOrganisationId, partnerOrganisationId });
    const queryRunner = this.userRepository.manager.connection.createQueryRunner();
    await this.transaction(updateUserDto, queryRunner, async (updateUserDto: UpdateUserDto) => {
      try {
        if (updateUserDto?.avatar?.id) {
          await queryRunner.manager.save(Document, {
            ...updateUserDto.avatar,
            entityId: user.id,
            entityType: EntityType.USER,
            type: DocumentType.IMAGE,
          });
        }

        delete updateUserDto.avatar;

        const acceptedLoa = user.userOrganisations.find((uo) => uo.organisationId === currentUser?.currentOrganisationId)?.loaAcceptedAt;

        if (updateUserDto.loadoc?.id && user.documents?.filter((doc) => doc.id === updateUserDto?.loadoc?.id).length === 0) {
          await queryRunner.manager.softRemove(
            user.documents?.filter(
              (doc) =>
                (doc.type === DocumentType.LETTER_OF_AUTHORITY || doc.type === DocumentType.LETTER_OF_AUTHORITY_GENERATED) &&
                doc.organisationId === currentUser?.currentOrganisationId,
            ),
          );
          updatedUploadedLoaDocument = await queryRunner.manager.save(Document, {
            ...updateUserDto.loadoc,
            entityId: user.id,
            entityType: EntityType.USER,
            type: DocumentType.LETTER_OF_AUTHORITY,
            organisationId: currentUser?.currentOrganisationId,
          });

          await queryRunner.manager.update(
            UserOrganisation,
            { userId: id, organisationId: currentUser?.currentOrganisationId },
            { loaAcceptedAt: null },
          );
        }

        const isBroker = user.userOrganisations.find((uo) => uo.organisationId === currentUser?.currentOrganisationId)?.role.name === Role.BROKER;

        if (
          isBroker &&
          updateUserDto.affiliation === Affiliation.EXTERNAL &&
          updateUserDto.loatype === LoaType.LOA_GENERATED &&
          (user.documents?.filter(
            (doc) => doc.type === DocumentType.LETTER_OF_AUTHORITY_GENERATED && doc.organisationId === currentUser?.currentOrganisationId,
          ).length === 0 ||
            !isMatch(pick(user, ['externalOrganisationName']), pick(updateUserDto, ['externalOrganisationName'])) ||
            !isMatch(pick(user, ['policyType']), pick(updateUserDto, ['policyType'])))
        ) {
          await queryRunner.manager.softRemove(
            user.documents?.filter(
              (doc) =>
                (doc.type === DocumentType.LETTER_OF_AUTHORITY || doc.type === DocumentType.LETTER_OF_AUTHORITY_GENERATED) &&
                doc.organisationId === currentUser?.currentOrganisationId,
            ),
          );

          orgMacs =
            currentUser?.role.name === Role.MAC ? [currentUser] : await this.findByRoleInOrganisation(currentUser?.currentOrganisationId, [Role.MAC]);

          if (!orgMacs.length) {
            throw new VisionException('USER', 'Error generating LOA document. MAC not found');
          }

          const uploadedDocument = await this.generateLoaDocument(currentUser, {
            externalOrganisationName: updateUserDto.externalOrganisationName,
            firstName: orgMacs[0].firstName,
            lastName: orgMacs[0].lastName,
            policyType: updateUserDto.policyType,
            email: updateUserDto.email,
          });

          externalLoaDocument = await queryRunner.manager.save(Document, {
            ...uploadedDocument,
            entityId: user.id,
            entityType: EntityType.USER,
            type: DocumentType.LETTER_OF_AUTHORITY_GENERATED,
            organisationId: currentUser.currentOrganisationId,
            name: uploadedDocument.filename,
            scanStatus: ScanStatus.CLEAN,
          });

          await queryRunner.manager.update(
            UserOrganisation,
            { userId: id, organisationId: currentUser.currentOrganisationId },
            { loaAcceptedAt: null },
          );
        }

        delete updateUserDto.loadoc;
        if (!acceptedLoa && updateUserDto?.loaaccept) {
          queryRunner.manager.update(
            UserOrganisation,
            { userId: id, organisationId: currentUser?.currentOrganisationId },

            { loaAcceptedAt: new Date() },
          );
        }
        delete updateUserDto.loaaccept;
        delete updateUserDto.roleId;

        delete updateUserDto.loatype;

        await queryRunner.manager.update(User, id, updateUserDto);
      } catch (e) {
        console.log(e);
        throw new BadRequestException(e);
      }
    });

    if (externalLoaDocument?.id) {
      for (const mac of orgMacs) {
        await this.notificationService.send({
          to: mac,
          templateParams: {
            name: `${mac.firstName} ${mac.lastName}`,
            brokerName: `${updateUserDto.firstName} ${updateUserDto.lastName}`,
          },
          subjectOverride: `A Letter of Authority has been generated for ${updateUserDto.firstName} ${updateUserDto.lastName}`,
          type: 'US-02-auto-generating-loa',
          attachments: [externalLoaDocument],
          organisationId: currentUser.currentOrganisationId,
        });
      }
      await this.notificationService.send({
        to: user,
        templateParams: {
          brokerName: `${updateUserDto.firstName} ${updateUserDto.lastName}`,
        },
        type: 'US-03-loa-updated',
        attachments: [externalLoaDocument],
        organisationId: currentUser.currentOrganisationId,
      });
    }

    if (updatedUploadedLoaDocument?.id) {
      await this.notificationService.send({
        to: user,
        templateParams: {
          brokerName: `${updateUserDto.firstName} ${updateUserDto.lastName}`,
        },
        type: 'US-03-loa-updated',
        attachments: [updatedUploadedLoaDocument],
        organisationId: currentUser.currentOrganisationId,
      });
    }
  }

  async updateUserPassword(id: string, password: string, organisationId: string) {
    try {
      const user = await this.findOne(id, { organisationId });
      if (!user) throw new NotFoundException("User doesn't exist");
      user.password = await hash(password, this.authenticationConfig.bcryptRounds);
      await this.userRepository.update(id, { password: user.password });
      return;
    } catch (e) {
      throw new BadRequestException(e);
    }
  }

  async completeResetPassword(id: string, password: string, token: string, organisationId: string) {
    return Promise.all([this.updateUserPassword(id, password, organisationId), this.deleteTokenHash(token)]);
  }

  async completeActivation(id: string, password: string, token: string, positionTitle: string, avatar: Document, organisationId: string, phone?: string, preferredContactMethod?: PreferredContactMethod) {
    const queryRunner = this.userRepository.manager.connection.createQueryRunner();

    await this.transaction({ password, token }, queryRunner, async (data: CompleteActivationDto) => {
      try {
        const user = await this.findOne(id, { organisationId });
        if (!user) throw new NotFoundException("User doesn't exist");

        if (avatar?.id) {
          await queryRunner.manager.save(Document, {
            ...avatar,
            entityId: user.id,
            entityType: EntityType.USER,
            type: DocumentType.IMAGE,
          });
        }

        if (this.isCompleteUser(user) && user.avatar?.id && avatar.id !== user.avatar.id) this.removeAvatar(user);

        const hashedPassword = await hash(data.password, this.authenticationConfig.bcryptRounds);
        const updateData: Partial<User> = { status: UserStatusType.ACTIVE, positionTitle, password: hashedPassword };
        
        // Update phone if provided and user doesn't have one
        if (phone && !user.phone) {
          updateData.phone = phone;
        }
        
        // Update preferredContactMethod if provided and user doesn't have one
        if (preferredContactMethod && !user.preferredContactMethod) {
          updateData.preferredContactMethod = preferredContactMethod;
        }
        
        await queryRunner.manager.update(User, id, updateData);

        await queryRunner.manager.softDelete(UserToken, { tokenHash: data.token });
      } catch (e) {
        console.log(e.message);
        throw new BadRequestException(e);
      }
    });
  }

  async resetPassword(user: User) {
    const token = this.generateToken();

    await this.deleteTokenType(user.id, UserTokenType.PASSWORD_RESET);
    await this.saveTokenHash(user.id, token, UserTokenType.PASSWORD_RESET, this.authenticationConfig.tokens.passwordReset.expiresIn);

    await this.notificationService.send({
      to: user,
      templateParams: {
        name: `${user.firstName} ${user.lastName}`,
        reset_link: `${this.appConfig.client.url}/reset-password?token=${token}`,
      },
      type: 'USER-02-reset-password',
      instant: true,
    });
  }

  async unassignFromOrg(id: string, ban: boolean, organisationId: string) {
    const user = await this.userRepository.findOne({ where: { id: id }, relations: { userOrganisations: { organisation: true } } });
    if (!user) throw new NotFoundException("User doesn't exist");

    await this.userOrganisationService.save({
      userId: user.id,
      organisationId,
      userStatus: ban ? UserOrganisationStatus.INACTIVE : UserOrganisationStatus.ACTIVE,
    });

    const savedUser = await this.userRepository.findOne({ where: { id: id }, relations: { userOrganisations: { organisation: true } } });
    if (!savedUser) throw new NotFoundException("User doesn't exist");
  }

  async offboardPartnerUsers(partnerOrganisation: PartnerOrganisation, sendNotifications = true) {
    const usersData = partnerOrganisation.userPartnerOrganisations.map((upo) => upo.user);
    const users = usersData.filter((u) => u.status !== UserStatusType.INACTIVE);
    const admin = partnerOrganisation.userPartnerOrganisations.find((upo) => upo.isAdmin)?.user;
    const userIds = users.map((u) => u.id);
    const queryRunner = this.userRepository.manager.connection.createQueryRunner();
    let offboardUersIds: string[];

    await this.transaction(null, queryRunner, async () => {
      try {
        if (partnerOrganisation.type === PartnerOrganisationType.INSURER) {
          const assignedPolicies = await queryRunner.manager.find(UserAsset, {
            where: { entityType: EntityType.INSURANCE_POLICY, userId: In(userIds), expiresAt: MoreThan(new Date()) },
          });

          offboardUersIds = userIds.filter((uid) => !assignedPolicies.map((p) => p.userId).includes(uid));

          if (offboardUersIds.length) {
            const assignedEngagements = await queryRunner.manager.find(UserAsset, {
              where: { entityType: EntityType.INSURER_ENGAGEMENT, userId: In(offboardUersIds), expiresAt: MoreThan(new Date()) },
            });
            offboardUersIds = offboardUersIds.filter((uid) => !assignedEngagements.map((p) => p.userId).includes(uid));
          }
        } else {
          const activeEngagements = await queryRunner.manager.find(InsurerEngagement, {
            where: {
              createdById: In(userIds),
              status: In([InsurerEngagementStatus.LIVE, InsurerEngagementStatus.REVIEWED, InsurerEngagementStatus.UNDER_REVIEW]),
            },
          });

          offboardUersIds = userIds.filter((uid) => !activeEngagements.map((p) => p.createdById).includes(uid));

          if (offboardUersIds.length) {
            const activePolicies = await queryRunner.manager.find(InsurancePolicy, {
              where: {
                createdById: In(offboardUersIds),
                status: In([InsurancePolicyStatus.ACTIVE, InsurancePolicyStatus.LIVE, , InsurancePolicyStatus.UNDER_REVIEW]),
              },
            });
            offboardUersIds = offboardUersIds.filter((uid) => !activePolicies.map((p) => p.createdById).includes(uid));
          }
        }

        const pendingOffboardIds = new Set(userIds.filter((id) => !offboardUersIds.includes(id)));
        if (pendingOffboardIds.size) {
          offboardUersIds = offboardUersIds.filter((id) => id !== admin.id);
          pendingOffboardIds.add(admin.id);
        } else {
          offboardUersIds.push(admin.id);
        }
        const userOrganisations = users
          .filter((f) => offboardUersIds.includes(f.id))
          .flatMap((u) => u.userOrganisations.map((uo) => ({ ...uo, userStatus: UserOrganisationStatus.INACTIVE })));

        if (pendingOffboardIds.size) {
          await queryRunner.manager.update(User, { id: In([...pendingOffboardIds]) }, { status: UserStatusType.OFFBOARD_PENDING });
          const pendingUsers = partnerOrganisation.userPartnerOrganisations.map((upo) => upo.user).filter((u) => pendingOffboardIds.has(u.id));
          sendNotifications &&
            (await this.notificationService.send({
              to: pendingUsers,
              templateParams: {
                partnerName: partnerOrganisation.orgName,
                user: partnerOrganisation.userPartnerOrganisations.find((upo) => upo.isAdmin).user,
              },
              type: 'PAR-09-pending-offboard-user',
            }));
        }
        if (offboardUersIds.length) {
          await queryRunner.manager.update(User, { id: In(offboardUersIds) }, { status: UserStatusType.INACTIVE });
          await queryRunner.manager.save(UserOrganisation, userOrganisations);

          const offBoardUsers = partnerOrganisation.userPartnerOrganisations.map((upo) => upo.user).filter((u) => offboardUersIds.includes(u.id));
          sendNotifications &&
            (await this.notificationService.send({
              to: offBoardUsers,
              templateParams: {
                partnerName: partnerOrganisation.orgName,
                user: partnerOrganisation.userPartnerOrganisations.find((upo) => upo.isAdmin).user,
              },
              type: 'PAR-08-instant-offboard-user',
            }));
        }
      } catch (e) {
        console.log(e);
        throw new BadRequestException(e);
      }
    });
  }
  async offboardOffboardables() {
    const users = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.userOrganisations', 'uo')
      .leftJoinAndSelect('uo.organisation', 'org')
      .innerJoinAndSelect('user.userPartnerOrganisations', 'upo', 'upo.isAdmin IS NOT TRUE')
      .where('user.status = :status', { status: UserStatusType.OFFBOARD_PENDING })
      .getMany();

    if (!users.length) 0;

    await this.bulkOffboard(users, PartnerOrganisationType.INSURER);
    await this.bulkOffboard(users, PartnerOrganisationType.BROKER);

    return users.length;
  }

  async bulkOffboard(users: User[], partnerOrganisationType: PartnerOrganisationType) {
    const queryRunner = this.userRepository.manager.connection.createQueryRunner();

    const userIds = users.map((u) => u.id);
    let offboardUersIds: string[];

    await this.transaction(null, queryRunner, async () => {
      try {
        if (partnerOrganisationType === PartnerOrganisationType.INSURER) {
          const assignedPolicies = await queryRunner.manager.find(UserAsset, {
            where: { entityType: EntityType.INSURANCE_POLICY, userId: In(userIds), expiresAt: MoreThan(new Date()) },
          });

          offboardUersIds = userIds.filter((uid) => !assignedPolicies.map((p) => p.userId).includes(uid));

          if (offboardUersIds.length) {
            const assignedEngagements = await queryRunner.manager.find(UserAsset, {
              where: { entityType: EntityType.INSURER_ENGAGEMENT, userId: In(offboardUersIds), expiresAt: MoreThan(new Date()) },
            });
            offboardUersIds = offboardUersIds.filter((uid) => !assignedEngagements.map((p) => p.userId).includes(uid));
          }
        } else {
          const activeEngagements = await queryRunner.manager.find(InsurerEngagement, {
            where: { createdById: In(userIds), status: InsurerEngagementStatus.LIVE },
          });

          offboardUersIds = userIds.filter((uid) => !activeEngagements.map((p) => p.createdById).includes(uid));

          if (offboardUersIds.length) {
            const activePolicies = await queryRunner.manager.find(InsurancePolicy, {
              where: { createdById: In(offboardUersIds), status: InsurancePolicyStatus.ACTIVE },
            });
            offboardUersIds = offboardUersIds.filter((uid) => !activePolicies.map((p) => p.createdById).includes(uid));
          }
        }
        // const d = await queryRunner.manager.find(User, { where: { id: In(offboardUersIds) } });
        const userOrganisations = users
          .filter((f) => offboardUersIds.includes(f.id))
          .flatMap((u) => u.userOrganisations.map((uo) => ({ ...uo, userStatus: UserOrganisationStatus.INACTIVE })));

        if (offboardUersIds.length) {
          await queryRunner.manager.update(User, { id: In(offboardUersIds) }, { status: UserStatusType.INACTIVE });
          await queryRunner.manager.save(UserOrganisation, userOrganisations);
        }
      } catch (e) {
        console.log(e);
        throw new BadRequestException(e);
      }
    });
  }

  async offboard(id: string, validateOnly = false, organisationId: string | null = null) {
    const user = await this.userRepository.findOne({
      where: { id: id },
      relations: { userPartnerOrganisations: true, userOrganisations: { role: true, organisation: true } },
    });

    if (!user) throw new NotFoundException("User doesn't exist");

    if (user.status === UserStatusType.INACTIVE) throw new BadRequestException('User is already offboarded');

    if (
      !validateOnly &&
      user.userPartnerOrganisations.length &&
      (user.userPartnerOrganisations[0].isAdmin || user.userPartnerOrganisations[0].isKeycontact)
    ) {
      throw new BadRequestException('Cannot offboard a partner key contact or partner admin');
    }

    const userOrganisations = user.userOrganisations.map((uo) => ({ ...uo, userStatus: UserOrganisationStatus.INACTIVE }));

    const queryRunner = this.userRepository.manager.connection.createQueryRunner();

    const dependencies = { policyIds: [], engagementIds: [], assetIds: [] };

    await this.transaction(null, queryRunner, async () => {
      try {
        let shouldOffboardPending = false;
        const isInsurer = user.userOrganisations.find((u) => u.role.name === Role.INSURER);
        const broker = user.userOrganisations.find((u) => u.role.name === Role.BROKER);
        const sac = user.userOrganisations.find((u) => u.role.name === Role.SAC);
        const pac = user.userOrganisations.find((u) => u.role.name === Role.PAC);
        if (isInsurer) {
          const assignedPolicies = await queryRunner.manager.find(UserAsset, {
            where: { entityType: EntityType.INSURANCE_POLICY, userId: user.id, expiresAt: MoreThan(new Date()) },
          });
          const assignedEngagements = await queryRunner.manager.find(UserAsset, {
            where: { entityType: EntityType.INSURER_ENGAGEMENT, userId: user.id, expiresAt: MoreThan(new Date()) },
          });
          shouldOffboardPending = assignedPolicies.length > 0 || assignedEngagements.length > 0;
          dependencies.policyIds = assignedPolicies.map((p) => p.entityId);
          dependencies.engagementIds = assignedEngagements.map((e) => e.entityId);
        } else if (broker) {
          const activeEngagements = await queryRunner.manager.find(InsurerEngagement, {
            where: {
              createdById: user.id,
              status: In([InsurerEngagementStatus.LIVE, InsurerEngagementStatus.REVIEWED, InsurerEngagementStatus.UNDER_REVIEW]),
            },
          });
          const activePolicies = await queryRunner.manager.find(InsurancePolicy, {
            where: {
              createdById: user.id,
              status: In([InsurancePolicyStatus.ACTIVE, InsurancePolicyStatus.LIVE, InsurancePolicyStatus.UNDER_REVIEW]),
            },
          });
          shouldOffboardPending = activeEngagements.length > 0 || activePolicies.length > 0;
          dependencies.policyIds = activePolicies.map((p) => p.id);
          dependencies.engagementIds = activeEngagements.map((e) => e.id);
        } else if (pac || sac) {
          const qb = queryRunner.manager.createQueryBuilder(UserAsset, 'userAsset').where('userAsset.userId = :userId', { userId: user.id });
          if (organisationId) {
            qb.innerJoin('userAsset.asset', 'asset').andWhere('asset.organisationId = :organisationId', { organisationId });
          }
          const userAsset = await qb.getMany();
          dependencies.assetIds = userAsset.map((a) => a.assetId);
        }

        if (!validateOnly) {
          if (shouldOffboardPending) {
            await queryRunner.manager.update(User, id, { status: UserStatusType.OFFBOARD_PENDING });
          } else {
            if (organisationId) {
              const userOrganisationsFiltered = user.userOrganisations
                .map((uo) => ({ ...uo, userStatus: UserOrganisationStatus.INACTIVE }))
                .filter((uo) => uo.organisationId === organisationId);

              await queryRunner.manager.save(UserOrganisation, userOrganisationsFiltered);

              const assetSelectedIds = await queryRunner.manager.find(Asset, { select: { id: true }, where: { organisationId } });
              if (assetSelectedIds.length > 0)
                await queryRunner.manager.softDelete(UserAsset, { userId: id, assetId: In(assetSelectedIds.map((a) => a.id)) });

              const activeOrganisationAssignements = await queryRunner.manager
                .getRepository(UserOrganisation)
                .find({ where: { userId: id, userStatus: UserOrganisationStatus.ACTIVE } });

              if (!activeOrganisationAssignements.length && !user.userPartnerOrganisations.length) {
                await queryRunner.manager.update(User, id, { status: UserStatusType.INACTIVE });
                await this.offboardUserNotification(user);
              }
            } else {
              await queryRunner.manager.update(User, id, { status: UserStatusType.INACTIVE });
              await queryRunner.manager.softDelete(UserAsset, { userId: id });
              await queryRunner.manager.save(UserOrganisation, userOrganisations);
              await this.offboardUserNotification(user);
            }
          }
        }
      } catch (e) {
        throw new BadRequestException(e);
      }
    });
    return { dependencies };
  }

  async offboardUserNotification(user: User) {
    return this.notificationService.send({
      to: user,
      type: 'OFF-01-offboard-user',
      templateParams: {},
      instant: true,
    });
  }

  async transaction(dto: TransactionDtos | TransactionDtos[], queryRunner: QueryRunner, callback: CallableFunction) {
    await queryRunner.startTransaction();
    try {
      const cb = await callback(dto, queryRunner);
      await queryRunner.commitTransaction();
      return cb;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAllWithAssignments(entityType: string, entityIds: string[], organisationId?: string): Promise<User[]> {
    const qb = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.userOrganisations', 'uo', 'uo.organisationId = :organisationId', {
        organisationId: organisationId,
      })
      .leftJoinAndSelect('uo.role', 'role')
      .leftJoinAndSelect('user.userAssets', 'ua')
      .leftJoinAndMapOne(
        'user.avatar',
        Document,
        'avatar',
        'avatar.entityId = user.id AND avatar.entityType = :entityType  AND avatar.type = :docType',
        {
          entityType: EntityType.USER,
          docType: DocumentType.IMAGE,
        },
      )
      .where('user.status != :status', { status: UserStatusType.INACTIVE });

    if (entityIds.length === 0) {
      return qb.getMany();
    }

    if (entityType === EntityType.ASSET) {
      qb.where('ua.assetId in (:...entityIds)', {
        entityIds,
      });
    } else {
      qb.where('ua.entityType = :entityType', { entityType }).andWhere('ua.entityId in (:...entityIds)', { entityIds });
    }

    return qb.getMany();
  }

  //IMPORTANT: Updating this logic might affect activate logic
  //TODO: Check if we can use activate method instead of this one on resend
  async resendInvite(userId: string, currentUser: CurrentUser, documentIds: string[]): Promise<void> {
    const invite = await this.notificationService.getUserInvite(userId);
    if (!invite) {
      throw new VisionException('NOTIFICATION', 'No invite found');
    }

    // const token = this.generateToken();
    // await this.deleteTokenType(userId, UserTokenType.ACTIVATE, true);
    // await this.saveToken(userId, token, UserTokenType.ACTIVATE, this.authenticationConfig.tokens.activation.expiresIn);
    // Get user to determine correct invite type
    const recipient = await this.userRepository.findOne({
      where: { id: invite.recipientId },
      relations: { userOrganisations: { role: true }, userPartnerOrganisations: { partnerOrganisation: true } },
    });

    if (!recipient) {
      throw new VisionException('USER', 'User not found');
    }

    // Determine correct notification type based on user's role and partner org status
    // If the original invite was a partner admin notification (PAR-03 or PAR-04), use role-based invite instead
    let notificationType: NotificationType;
    if (invite.type === 'PAR-03-existing-user-added-as-admin' || invite.type === 'PAR-04-new-user-added-as-admin') {
      // Use role-based invite template for resend
      const userRole = recipient.userOrganisations.find((uo) => uo.organisationId === INITIAL_ORGANISATION_ID)?.role;
      if (userRole) {
        notificationType = this.getRoleTemplateMap()[userRole.name];
      } else {
        // Fallback to broker invite if role not found
        notificationType = 'USER-03-invite-broker';
      }
    } else {
      // Use original invite type if it's a valid notification type
      notificationType = invite.type as NotificationType;
    }

    // Generate new token and replace existing one (following the old pattern from commented code)
    const token = this.generateToken();
    await this.deleteTokenType(recipient.id, UserTokenType.ACTIVATE, true); // Soft delete to match old behavior
    await this.saveToken(recipient.id, token, UserTokenType.ACTIVATE, this.authenticationConfig.tokens.activation.expiresIn);

    const newInviteParams = {
      params: {
        ...invite.params,
        register_link: `${this.appConfig.client.url}/activate?token=${token}`,
        user: recipient,
      },
    };

    if (documentIds?.length) {
      const attachments = await this.documentService.findByIds(documentIds);
      if (!attachments.length) {
        throw new VisionException('NOTIFICATION', 'No documents found for the provided IDs');
      }

      await this.notificationService.send({
        to: recipient,
        templateParams: newInviteParams.params,
        type: notificationType,
        instant: true,
        attachments,
        organisationId: INITIAL_ORGANISATION_ID,
      });
    } else {
      // Create new notification with correct type instead of resending with original type
      await this.notificationService.send({
        to: recipient,
        templateParams: newInviteParams.params,
        type: notificationType,
        organisationId: INITIAL_ORGANISATION_ID,
        instant: true,
      });
    }

    await this.userEventService.create({
      entityType: EntityType.USER,
      targetId: userId,
      userId: currentUser.id,
      targetName: `${currentUser.firstName} ${currentUser.lastName}`,
      type: UserEventType.INVITE_RESENT,
    });
  }
}