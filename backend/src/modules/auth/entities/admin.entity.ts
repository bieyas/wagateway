import { Entity, Column, BeforeInsert } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import * as bcrypt from 'bcrypt';

@Entity('admins')
export class Admin extends BaseEntity {
  @Column({ unique: true })
  username: string;

  @Column()
  password: string;

  @Column({ default: 'admin' })
  role: string;

  @BeforeInsert()
  async hashPassword() {
    if (this.password) {
      this.password = await bcrypt.hash(this.password, 10);
    }
  }
}
