import { Controller, Post, Get, Delete, Body, Param, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { UserRole } from './entities/user.entity';
import { successResponse } from '../../common/utils/response.util';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Login dengan email/username dan password' })
  async login(@Body() dto: LoginDto) {
    const result = await this.authService.login(dto);
    return successResponse(result, 'Login berhasil');
  }

  @Post('register')
  @ApiOperation({ summary: 'Daftarkan organisasi baru beserta akun owner' })
  async register(@Body() body: { orgName: string; slug: string; email: string; password: string; fullName?: string }) {
    const result = await this.authService.registerOrganization(body);
    return successResponse(result, 'Organisasi berhasil didaftarkan');
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user info' })
  async me(@Request() req: any) {
    const user = req.user;
    return successResponse({
      id: user.id,
      email: user.email,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      organizationId: user.organizationId,
    });
  }

  @Post('members')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Undang anggota baru ke organisasi (owner only)' })
  async inviteMember(
    @Request() req: any,
    @Body() body: { email: string; password: string; fullName?: string; role?: UserRole },
  ) {
    const user = req.user;
    if (user.role !== UserRole.OWNER && user.role !== UserRole.SUPERADMIN) {
      throw new ForbiddenException('Hanya owner yang bisa mengundang anggota');
    }
    const member = await this.authService.inviteMember({ ...body, organizationId: user.organizationId });
    return successResponse({ id: member.id, email: member.email, fullName: member.fullName, role: member.role }, 'Anggota berhasil diundang');
  }

  @Get('members')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List anggota organisasi' })
  async listMembers(@Request() req: any) {
    const user = req.user;
    if (!user.organizationId) throw new ForbiddenException('Tidak terhubung ke organisasi');
    const members = await this.authService.listMembers(user.organizationId);
    return successResponse(members.map(m => ({ id: m.id, email: m.email, fullName: m.fullName, role: m.role, isActive: m.isActive })));
  }

  @Delete('members/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Hapus anggota dari organisasi (owner only)' })
  async removeMember(@Request() req: any, @Param('userId') userId: string) {
    const user = req.user;
    if (user.role !== UserRole.OWNER && user.role !== UserRole.SUPERADMIN) {
      throw new ForbiddenException('Hanya owner yang bisa menghapus anggota');
    }
    await this.authService.removeMember(userId, user.organizationId);
    return successResponse(null, 'Anggota berhasil dihapus');
  }
}
