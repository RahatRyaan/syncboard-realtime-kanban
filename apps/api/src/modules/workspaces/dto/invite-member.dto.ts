import { IsEmail, IsIn, IsNotEmpty } from 'class-validator';
import { MembershipRole } from '@syncboard/shared-types';

export class InviteMemberDto {
  @IsEmail({}, { message: 'Invalid email address for invite' })
  @IsNotEmpty({ message: 'Invite email is required' })
  email: string;

  @IsIn(['admin', 'member', 'viewer'], {
    message: 'Role must be admin, member, or viewer',
  })
  @IsNotEmpty({ message: 'Role is required' })
  role: MembershipRole;
}
