import { z } from "zod";

const SubscribeSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
});

export { SubscribeSchema };
export type SubscribeSchemaType = z.infer<typeof SubscribeSchema>;