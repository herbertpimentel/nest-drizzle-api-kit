export const createUserValidationSchema = {
  safeParse(input: unknown) {
    return { success: true as const, data: input };
  },
};

const defaultValidationSchema = {
  safeParse(input: unknown) {
    return { success: true as const, data: input };
  },
};

export default defaultValidationSchema;
