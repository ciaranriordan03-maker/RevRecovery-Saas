export const ENVIRONMENT_FLAG_STATES = [
  "enabled",
  "disabled",
  "missing",
  "invalid",
] as const;

export type EnvironmentFlagState = (typeof ENVIRONMENT_FLAG_STATES)[number];

export function getEnvironmentFlagState(
  value: string | undefined,
): EnvironmentFlagState {
  const normalized = value?.trim();

  if (!normalized) return "missing";
  if (normalized === "true") return "enabled";
  if (normalized === "false") return "disabled";
  return "invalid";
}

export function isEnvironmentFlagEnabled(value: string | undefined) {
  return getEnvironmentFlagState(value) === "enabled";
}

export type RecoveryDeliveryEnvironmentDecision = {
  allowed: boolean;
  deliveryEnabledState: EnvironmentFlagState;
  killSwitchState: EnvironmentFlagState;
  reason:
    | "delivery_disabled"
    | "delivery_not_explicitly_enabled"
    | "enabled"
    | "kill_switch_enabled"
    | "kill_switch_not_explicitly_disabled";
};

export function evaluateRecoveryDeliveryEnvironment({
  deliveryEnabled,
  killSwitch,
}: {
  deliveryEnabled: string | undefined;
  killSwitch: string | undefined;
}): RecoveryDeliveryEnvironmentDecision {
  const deliveryEnabledState = getEnvironmentFlagState(deliveryEnabled);
  const killSwitchState = getEnvironmentFlagState(killSwitch);

  if (killSwitchState === "enabled") {
    return {
      allowed: false,
      deliveryEnabledState,
      killSwitchState,
      reason: "kill_switch_enabled",
    };
  }

  if (killSwitchState !== "disabled") {
    return {
      allowed: false,
      deliveryEnabledState,
      killSwitchState,
      reason: "kill_switch_not_explicitly_disabled",
    };
  }

  if (deliveryEnabledState === "disabled") {
    return {
      allowed: false,
      deliveryEnabledState,
      killSwitchState,
      reason: "delivery_disabled",
    };
  }

  if (deliveryEnabledState !== "enabled") {
    return {
      allowed: false,
      deliveryEnabledState,
      killSwitchState,
      reason: "delivery_not_explicitly_enabled",
    };
  }

  return {
    allowed: true,
    deliveryEnabledState,
    killSwitchState,
    reason: "enabled",
  };
}
