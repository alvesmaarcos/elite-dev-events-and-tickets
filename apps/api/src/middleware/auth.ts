import { NextFunction, Request, Response} from "express";
import jwt from "jsonwebtoken";
import { Role } from "../generated/prisma/enums";
import { env } from "../env";
import { read } from "node:fs";

export interface AuthUser {
    id: string;
    email: string;
    name: string;
    role: Role;
}

declare global {
    namespace Express {
        interface Request {
            user?: AuthUser;
        }
    }
}

const UM_DIA_EM_SEGUNDOS = 60 * 60 * 24;

export function signToken(user: AuthUser): string {
    return jwt.sign(user, env.jwtSecret, { expiresIn: UM_DIA_EM_SEGUNDOS});
}

function readToken(req: Request): AuthUser | null {
    const header = req.header("authorization");
    if(!header || !header.startsWith("Bearer ")) return null;

    const token = header.slice("Bearer ".length).trim();
    try {
        return jwt.verify(token, env.jwtSecret) as AuthUser;
    } catch {
        return null
    }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
    const user = readToken(req);
    if(!user) {
        res.status(401).json({ error: "Sua sessão expirou. Faça login para continuar."});
        return;
    }
    req.user = user;
    next();
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
    const user = readToken(req);
    if (user) req.user = user;
    next();
}

export function requireRole(...roles: Role[]) {
    return (req: Request, res: Response, next: NextFunction) => {
        if(!req.user || !roles.includes(req.user.role)) {
            res.status(403).json({ error: "Sem permissão para essa acao."});
            return;
        }
        next();
    };
}