import type { ComponentProps } from "react";
import { Box } from "@gluestack-ui/themed";

export const CONTENT_MAX_WIDTH = 800;

type BoxStyle = NonNullable<ComponentProps<typeof Box>["style"]>;

export const contentColumnStyle: BoxStyle = {
  width: "100%",
  maxWidth: CONTENT_MAX_WIDTH,
  marginLeft: "auto",
  marginRight: "auto",
};
