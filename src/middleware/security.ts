import helmet from "helmet";

export const securityHeaders = helmet({
	contentSecurityPolicy: {
		directives: {
			defaultSrc: ["'self'"],
			scriptSrc: ["'self'"],
			styleSrc: ["'self'"],
			imgSrc: ["'self'", "data:", "https:"]
		}
	},
	crossOriginEmbedderPolicy: true,
	crossOriginOpenerPolicy: true,
	crossOriginResourcePolicy: { policy: "same-site" },
	dnsPrefetchControl: true,
	frameguard: { action: "deny" },
	hidePoweredBy: true,
	hsts: true,
	ieNoOpen: true,
	noSniff: true,
	referrerPolicy: { policy: "strict-origin-when-cross-origin" },
	xssFilter: true
});
