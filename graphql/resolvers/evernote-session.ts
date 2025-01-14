import { EvernoteSession, PrismaClient } from '@prisma/client';

import { AppContext } from '../context';

import {
  getActiveSession,
  getInFlightSession,
  getDefaultEvernoteSessionResponse,
  finalizeAuthentication,
  startAuthentication
} from './helpers/evernote-session';

// TODO move these
type EvernoteSessionForUserArgs = {
  userId: string;
};

type AuthenticateEvernoteSessionArgs = {
  oauthVerifier?: string;
  userId: string;
};

type ClearEvernoteSessionArgs = {
  userId: string;
};

type PartialAppContext = {
  prisma: PrismaClient;
};

export const getEvernoteSessionForUser = async (
  _root: unknown,
  args: EvernoteSessionForUserArgs,
  ctx: PartialAppContext | AppContext
): Promise<EvernoteSession> => {
  const { prisma } = ctx;
  const { userId } = args;

  let response: EvernoteSession = getDefaultEvernoteSessionResponse(userId);

  try {
    const evernoteSessions: EvernoteSession[] =
      await prisma.evernoteSession.findMany({
        where: {
          userId,
          isExpired: false,
          NOT: {
            AND: {
              expires: null,
              evernoteAuthToken: null
            }
          }
        }
      });

    if (evernoteSessions.length > 0) {
      // look for an active one
      const activeSession = evernoteSessions.find(
        ({ evernoteAuthToken, expires }) =>
          evernoteAuthToken && expires && !(new Date() > expires)
      );

      if (activeSession) {
        response = { ...activeSession, userId };
      }
    }
  } catch (err) {
    response.error = `${err}`;
  }
  return response;
};

export const handleAuthenticateEvernoteSession = async (
  _root: unknown,
  args: AuthenticateEvernoteSessionArgs,
  ctx: AppContext
): Promise<EvernoteSession> => {
  const { prisma } = ctx;
  const { oauthVerifier = null, userId } = args;

  const response: EvernoteSession = getDefaultEvernoteSessionResponse(userId);

  try {
    const userSessions = await prisma.evernoteSession.findMany({
      where: {
        userId,
        isExpired: false
      }
    });

    // check for active sessions
    const activeSession = getActiveSession(userSessions);
    if (!!activeSession) {
      return {
        ...activeSession,
        userId
      };
    }

    // check for partial evernote session response
    const inFlightSession = !!oauthVerifier && getInFlightSession(userSessions);
    if (!!inFlightSession) {
      return finalizeAuthentication(ctx, inFlightSession, oauthVerifier);
    }

    // otherwise create a new session and start the auth process
    const session = await prisma.evernoteSession.create({
      data: { loading: true, user: { connect: { id: userId } } }
    });

    return startAuthentication(ctx);
  } catch (err) {
    response.error = `${err}`;
  }
  return response;
};

export const handleClearEvernoteSession = async (
  _root: unknown,
  args: ClearEvernoteSessionArgs,
  ctx: AppContext
): Promise<EvernoteSession> => {
  const { prisma } = ctx;
  const { userId } = args;

  const response: EvernoteSession = getDefaultEvernoteSessionResponse(userId);

  try {
    const userSessions = await prisma.evernoteSession.findMany({
      where: {
        userId,
        isExpired: false
      }
    });

    // expire any of these sessions
    (userSessions ?? []).forEach(async ({ id }) => {
      await prisma.evernoteSession.update({
        data: { isExpired: true },
        where: { id }
      });
    });
    response.isExpired = true;
  } catch (err) {
    response.error = `${err}`;
  }
  return response;
};
