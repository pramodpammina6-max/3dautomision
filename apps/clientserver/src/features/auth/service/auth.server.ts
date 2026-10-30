import 'server-only';
import bcrypt from 'bcryptjs';
import { MongoServerError, ObjectId } from 'mongodb';
import { getDb } from '@/common/server/db';
import { HttpError } from '@/common/server/http';
import type { SessionUser } from '@/common/types';
import type { LoginInput, SignupInput } from './auth.schemas';

interface UserDoc {
  _id: ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
}

const users = async () => (await getDb()).collection<UserDoc>('users');

const toUser = (u: UserDoc): SessionUser => ({ id: u._id.toHexString(), name: u.name, email: u.email });

export async function registerUser(input: SignupInput): Promise<SessionUser> {
  const doc: UserDoc = {
    _id: new ObjectId(),
    name: input.name,
    email: input.email,
    passwordHash: await bcrypt.hash(input.password, 12),
    createdAt: new Date(),
  };
  try {
    await (await users()).insertOne(doc);
  } catch (err) {
    if (err instanceof MongoServerError && err.code === 11000) {
      throw new HttpError(409, 'An account with this email already exists');
    }
    throw err;
  }
  return toUser(doc);
}

export async function authenticate(input: LoginInput): Promise<SessionUser> {
  const user = await (await users()).findOne({ email: input.email });
  // Compare even when the user is missing so response timing does not reveal account existence.
  const ok = await bcrypt.compare(input.password, user?.passwordHash ?? '$2b$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinv');
  if (!user || !ok) throw new HttpError(401, 'Invalid email or password');
  return toUser(user);
}
