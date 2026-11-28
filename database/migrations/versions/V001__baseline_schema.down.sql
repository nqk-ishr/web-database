DROP TABLE IF EXISTS vehicle_status_history, insurance_claims, policy_payments, insurance_policies, insurance_products,
    payments, violations, registration_requests, ownership_history, vehicles, cameras, violation_types,
    vehicle_types, users, insurers, roles CASCADE;
DROP FUNCTION IF EXISTS fn_rule_fail(text), fn_owner_at(bigint, timestamptz), fn_touch_updated_at(),
    fn_enforce_status_transitions(), fn_users_check_insurer(), fn_assert_transfer_allowed(bigint, bigint),
    fn_requests_before_insert(), fn_requests_before_approve(), fn_violations_checks(), fn_payments_before_insert(),
    fn_policies_before_insert(), fn_policies_before_update(), fn_policy_payments_before_insert(),
    fn_claims_before_insert(), fn_claims_before_update() CASCADE;
DROP TYPE IF EXISTS vehicle_event, claim_status, claim_type, policy_status, txn_status, violation_status,
    request_status, request_type, vehicle_status CASCADE;
