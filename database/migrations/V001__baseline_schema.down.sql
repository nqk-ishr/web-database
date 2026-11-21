DROP TABLE IF EXISTS appeals, payments, violations, inspections, registrations, vehicles, owners,
                     cameras, violation_types, vehicle_models, vehicle_types, users CASCADE;
DROP TYPE IF EXISTS appeal_status, payment_status, payment_method, violation_status, detection_source,
                    inspection_result, registration_status, vehicle_usage, owner_kind, officer_type, user_role;
