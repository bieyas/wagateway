import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Admin } from './entities/admin.entity';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Admin)
    private readonly adminRepo: Repository<Admin>,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto): Promise<{ accessToken: string; admin: { id: string; username: string; role: string } }> {
    const admin = await this.adminRepo.findOne({ where: { username: dto.username } });
    if (!admin) throw new UnauthorizedException('Username atau password salah');

    const valid = await bcrypt.compare(dto.password, admin.password);
    if (!valid) throw new UnauthorizedException('Username atau password salah');

    const payload = { sub: admin.id, username: admin.username, role: admin.role };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      admin: { id: admin.id, username: admin.username, role: admin.role },
    };
  }

  async createAdmin(username: string, password: string): Promise<Admin> {
    const exists = await this.adminRepo.findOne({ where: { username } });
    if (exists) throw new ConflictException(`Admin '${username}' sudah ada`);
    const admin = this.adminRepo.create({ username, password });
    return this.adminRepo.save(admin);
  }

  async hasAnyAdmin(): Promise<boolean> {
    const count = await this.adminRepo.count();
    return count > 0;
  }
}
