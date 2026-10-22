#!/usr/bin/env node

import nextEnv from "@next/env";
import { pathToFileURL } from "node:url";

const { loadEnvConfig } = nextEnv;

const CONFIGURATION_REQUIREMENTS = [
  { category: "public", key: "NEXT_PUBLIC_SUPABASE_URL", minimumLength: 10 },
  {
    category: "public",
    key: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    minimumLength: 20,
  },
  { category: "private", key: "SUPABASE_SECRET_KEY", minimumLength: 20 },
  { category: "public", key: "NEXT_PUBLIC_APP_URL", minimumLength: 10 },
  { category: "private", key: "STRIPE_SECRET_KEY", minimumLength: 12 },
  {
    category: "private",
    key: "STRIPE_CONNECT_CLIENT_ID",
    minimumLength: 5,
  },
  { category: "private", key: "STRIPE_WEBHOOK_SECRET", minimumLength: 12 },
  {
    category: "private",
    key: "STRIPE_TOKEN_ENCRYPTION_KEY",
    minimumLength: 32,
  },
  { category: "private", key: "RESEND_API_KEY", minimumLength: 8 },
  { category: "private", key: "RESEND_WEBHOOK_SECRET", minimumLength: 12 },
  { category: "configuration", key: "RECOVERY_EMAIL_FROM", minimumLength: 5 },
  {
    category: "private",
    key: "RECOVERY_EMAIL_CRON_SECRET",
    minimumLength: 24,
  },
  { category: "private", key: "CRON_SECRET", minimumLength: 24 },
];

function inspectConfiguredValue(value, minimumLength) {
  const normalized = typeof value === "string" ? value.trim() : "";

  if (!normalized) return "missing";
  if (
    normalized.length < minimumLength ||
    /[\r\n]/.test(normalized) ||
    /^[A-Z][A-Z0-9_]*\s*=/.test(normalized)
  ) {
    return "invalid";
  }
  return "configured";
}

function getFlagState(value) {
  const normalized = typeof value === "string" ? value.trim() : "";

  if (!normalized) return "missing";
  if (normalized === "true") return "enabled";
  if (normalized === "false") return "disabled";
  return "invalid";
}

export function inspectDeliveryPreflight(environment) {
  const configuration = CONFIGURATION_REQUIREMENTS.map((requirement) => ({
    category: requirement.category,
    key: requirement.key,
    status: inspectConfiguredValue(
      environment[requirement.key],
      requirement.minimumLength,
    ),
  }));
  const stripeTokenKey = environment.STRIPE_TOKEN_ENCRYPTION_KEY?.trim();
  const supabaseSecretKey = environment.SUPABASE_SECRET_KEY?.trim();
  configuration.push({
    category: "separation",
    key: "STRIPE_TOKEN_ENCRYPTION_KEY_SEPARATION",
    status:
      stripeTokenKey &&
      supabaseSecretKey &&
      stripeTokenKey !== supabaseSecretKey
        ? "configured"
        : "invalid",
  });
  const recoveryDeliveryState = getFlagState(
    environment.RECOVERY_DELIVERY_ENABLED,
  );
  const recoveryKillSwitchState = getFlagState(
    environment.RECOVERY_DELIVERY_KILL_SWITCH,
  );
  const notificationDeliveryState = getFlagState(
    environment.ESSENTIAL_NOTIFICATION_DELIVERY_ENABLED,
  );
  const authorizedTestDeliveryState = getFlagState(
    environment.ESSENTIAL_NOTIFICATION_AUTHORIZED_TEST_DELIVERY_ENABLED,
  );
  const gates = [
    {
      detail:
        recoveryDeliveryState === "disabled" &&
        recoveryKillSwitchState === "enabled"
          ? "explicitly disabled; kill switch armed"
          : "blocked by application defaults, but safe flags are not explicit",
      name: "Customer recovery delivery",
      passed:
        recoveryDeliveryState === "disabled" &&
        recoveryKillSwitchState === "enabled",
      states: {
        delivery: recoveryDeliveryState,
        killSwitch: recoveryKillSwitchState,
      },
    },
    {
      detail:
        notificationDeliveryState === "disabled"
          ? "explicitly disabled"
          : "not explicitly disabled",
      name: "Essential notification delivery",
      passed: notificationDeliveryState === "disabled",
      states: { delivery: notificationDeliveryState },
    },
    {
      detail:
        authorizedTestDeliveryState === "disabled"
          ? "explicitly disabled"
          : "not explicitly disabled",
      name: "Authorized test notification delivery",
      passed: authorizedTestDeliveryState === "disabled",
      states: { delivery: authorizedTestDeliveryState },
    },
  ];
  const configurationPassed = configuration.every(
    (item) => item.status === "configured",
  );
  const gatesPassed = gates.every((gate) => gate.passed);

  return {
    configuration,
    configurationPassed,
    gates,
    gatesPassed,
    passed: configurationPassed && gatesPassed,
  };
}

export function formatDeliveryPreflight(report) {
  const lines = [
    "RevRecovery redacted delivery preflight",
    "Values are never printed.",
    "",
    "Configuration",
  ];

  for (const item of report.configuration) {
    lines.push(
      `${item.status === "configured" ? "PASS" : "FAIL"} ${item.key}: ${item.status} (${item.category})`,
    );
  }

  lines.push("", "Delivery gates");
  for (const gate of report.gates) {
    const states = Object.entries(gate.states)
      .map(([name, state]) => `${name}=${state}`)
      .join(", ");
    lines.push(
      `${gate.passed ? "PASS" : "FAIL"} ${gate.name}: ${gate.detail} (${states})`,
    );
  }

  lines.push(
    "",
    report.passed
      ? "RESULT PASS: required configuration is present and every delivery path is explicitly disabled."
      : "RESULT FAIL: configuration or explicit delivery-disable evidence needs attention.",
  );
  return lines.join("\n");
}

function run() {
  loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production", {
    error() {},
    info() {},
  });
  const report = inspectDeliveryPreflight(process.env);
  console.log(formatDeliveryPreflight(report));
  process.exitCode = report.passed ? 0 : 1;
}

const invokedPath = process.argv[1]
  ? pathToFileURL(process.argv[1]).href
  : null;

if (invokedPath === import.meta.url) {
  run();
}
