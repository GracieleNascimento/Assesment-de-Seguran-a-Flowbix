/**
 * Tipos de Request/Reply para os controllers, derivados dos schemas Zod dos validators.
 * Assim o controller recebe body/query/params já validados e tipados, sem repetir tipos.
 */
import type {
  ContextConfigDefault, FastifyReply, FastifyRequest, FastifySchema,
  RawReplyDefaultExpression, RawRequestDefaultExpression, RawServerDefault, RouteGenericInterface,
} from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";

export type Req<S extends FastifySchema = FastifySchema> = FastifyRequest<
  RouteGenericInterface, RawServerDefault, RawRequestDefaultExpression, S, ZodTypeProvider
>;

export type Res<S extends FastifySchema = FastifySchema> = FastifyReply<
  RouteGenericInterface, RawServerDefault, RawRequestDefaultExpression, RawReplyDefaultExpression,
  ContextConfigDefault, S, ZodTypeProvider
>;
