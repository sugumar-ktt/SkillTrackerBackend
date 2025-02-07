import type { Request } from "express";

export const getBearerToken = (request: Request) => {
	const authHeader = request.headers.authorization;
	if (!(authHeader && authHeader.startsWith("Bearer "))) {
		return undefined;
	}
	const token = authHeader.split(" ").at(1);
	return token?.trim();
};
