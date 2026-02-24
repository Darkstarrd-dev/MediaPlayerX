interface ResolveMetadataMainDeltaParams {
  proposedMainDelta: number;
  rightGap: number;
  cellSpan: number;
  maxExpandableMainDelta: number;
  maxShrinkMainDelta: number;
  minActionPx: number;
  expandBufferPx: number;
  shrinkWouldDropColumns: boolean;
}

export function resolveMetadataMainDelta({
  proposedMainDelta,
  rightGap,
  cellSpan,
  maxExpandableMainDelta,
  maxShrinkMainDelta,
  minActionPx,
  expandBufferPx,
  shrinkWouldDropColumns,
}: ResolveMetadataMainDeltaParams): number {
  const minExpandNeeded = Math.max(0, cellSpan - rightGap);
  let desiredMainDelta = proposedMainDelta;

  const resolveExpandDelta = () => {
    if (maxExpandableMainDelta + minActionPx < minExpandNeeded) {
      return 0;
    }

    const expandTargetDelta = Math.max(0, cellSpan - rightGap + expandBufferPx);
    const expandDelta = Math.min(expandTargetDelta, maxExpandableMainDelta);
    if (expandDelta + minActionPx < minExpandNeeded) {
      return 0;
    }
    return expandDelta;
  };

  if (desiredMainDelta > 0) {
    if (maxExpandableMainDelta + minActionPx < minExpandNeeded) {
      desiredMainDelta = -rightGap;
    } else {
      desiredMainDelta = Math.min(desiredMainDelta, maxExpandableMainDelta);
    }
  }

  // 左吸附若受 metadata 上限约束无法完成，应回弹而非部分吸附后锁定。
  if (
    desiredMainDelta < 0 &&
    -desiredMainDelta > maxShrinkMainDelta + minActionPx
  ) {
    return resolveExpandDelta();
  }

  if (!shrinkWouldDropColumns || desiredMainDelta >= 0) {
    return desiredMainDelta;
  }

  return resolveExpandDelta();
}
