type SuccessResult<T> = {
	error?: null;
	result: T;
};
type ErrorResult = {
	error: Error;
	result?: null;
};

export type ResultType<T> = SuccessResult<T> | ErrorResult;
