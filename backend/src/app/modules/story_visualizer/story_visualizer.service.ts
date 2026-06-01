import httpStatus from "http-status";
import ApiError from "../../../errors/api_error";
import {
  GenerationTimeoutError,
  raceGenerationWithTimeout,
} from "../../../utils/generation_timeout";
import { generateStoryboardWithGemini } from "../ai_model/ai_model.utils";
import {
  IStoryVisualizerPayload,
  IStoryVisualizerResult,
} from "./story_visualizer.interface";

const STORYBOARD_GENERATION_TIMEOUT_MS = 60000;

const mapStoryVisualizerError = (error: unknown): never => {
  if (error instanceof ApiError) {
    throw error;
  }

  if (error instanceof GenerationTimeoutError) {
    throw new ApiError(
      httpStatus.GATEWAY_TIMEOUT,
      "Story visualizer generation timed out. Please try again."
    );
  }

  const errorMsg = error instanceof Error ? error.message : String(error);
  throw new ApiError(
    httpStatus.BAD_GATEWAY,
    `Story visualizer generation failed: ${errorMsg}`
  );
};

const generateStoryboard = async (
  payload: IStoryVisualizerPayload
): Promise<IStoryVisualizerResult> => {
  const language = payload.language ?? "English";

  try {
    return await raceGenerationWithTimeout(
      () =>
        generateStoryboardWithGemini({
          ...payload,
          language,
        }),
      STORYBOARD_GENERATION_TIMEOUT_MS
    );
  } catch (error) {
    return mapStoryVisualizerError(error);
  }
};

export const StoryVisualizerService = {
  generateStoryboard,
};
