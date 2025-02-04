export { type ModelInstances, type Models } from "./types";
export { models };
import models from "./types";

for (const model of Object.values(models)) {
	if (model.associate && typeof model.associate == "function") {
		model.associate(models);
	}
}

export default models;
