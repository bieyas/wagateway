import { Injectable, UnauthorizedException, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from './entities/user.entity';
import { Organization } from './entities/organization.entity';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto): Promise<{ accessToken: string; user: object }> {
    const user = await this.userRepo.findOne({
      where: [{ email: dto.username }, { username: dto.username }],
      relations: ['organization'],
    });
    if (!user || !user.isActive) throw new UnauthorizedException('Username atau password salah');

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Username atau password salah');

    const payload = {
      sub: user.id,
      username: user.username || user.email,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId ?? null,
    };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        username: user.username || user.email,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        organizationId: user.organizationId,
        organization: user.organization ? { id: user.organization.id, name: user.organization.name, slug: user.organization.slug } : null,
      },
    };
  }

  async registerOrganization(dto: {
    orgName: string;
    slug: string;
    email: string;
    password: string;
    fullName?: string;
  }): Promise<{ accessToken: string; user: object }> {
    const slugExists = await this.orgRepo.findOne({ where: { slug: dto.slug } });
    if (slugExists) throw new ConflictException(`Slug '${dto.slug}' sudah digunakan`);

    const emailExists = await this.userRepo.findOne({ where: { email: dto.email } });
    if (emailExists) throw new ConflictException(`Email '${dto.email}' sudah terdaftar`);

    const org = this.orgRepo.create({ name: dto.orgName, slug: dto.slug });
    await this.orgRepo.save(org);

    const user = this.userRepo.create({
      email: dto.email,
      username: dto.email,
      password: dto.password,
      fullName: dto.fullName,
      role: UserRole.OWNER,
      organizationId: org.id,
    });
    await this.userRepo.save(user);

    return this.login({ username: dto.email, password: dto.password });
  }

  async inviteMember(dto: {
    email: string;
    password: string;
    fullName?: string;
    role?: UserRole;
    organizationId: string;
  }): Promise<User> {
    const org = await this.orgRepo.findOne({ where: { id: dto.organizationId } });
    if (!org) throw new NotFoundException('Organization tidak ditemukan');

    const exists = await this.userRepo.findOne({ where: { email: dto.email } });
    if (exists) throw new ConflictException(`Email '${dto.email}' sudah terdaftar`);

    const user = this.userRepo.create({
      email: dto.email,
      username: dto.email,
      password: dto.password,
      fullName: dto.fullName,
      role: dto.role ?? UserRole.MEMBER,
      organizationId: dto.organizationId,
    });
    return this.userRepo.save(user);
  }

  async listMembers(organizationId: string): Promise<User[]> {
    return this.userRepo.find({ where: { organizationId }, order: { createdAt: 'ASC' } });
  }

  async removeMember(userId: string, organizationId: string): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: userId, organizationId } });
    if (!user) throw new NotFoundException('User tidak ditemukan');
    if (user.role === UserRole.OWNER) throw new ConflictException('Tidak bisa hapus owner');
    await this.userRepo.remove(user);
  }

  async hasAnyUser(): Promise<boolean> {
    return (await this.userRepo.count()) > 0;
  }

  async createSuperadmin(email: string, password: string): Promise<User> {
    const exists = await this.userRepo.findOne({ where: { email } });
    if (exists) throw new ConflictException(`Email '${email}' sudah ada`);
    const user = this.userRepo.create({ email, username: email, password, role: UserRole.SUPERADMIN });
    return this.userRepo.save(user);
  }
}
