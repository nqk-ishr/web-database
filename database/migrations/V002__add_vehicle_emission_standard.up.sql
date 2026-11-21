-- V002: them cot tieu chuan khi thai tren CSDL DA CO DU LIEU (them -> backfill -> rang buoc)
ALTER TABLE vehicles ADD COLUMN emission_standard VARCHAR(10);
-- Gia tri mo phong theo nam san xuat (nhom thay bang du lieu that khi co)
UPDATE vehicles SET emission_standard = CASE
    WHEN manufacture_year >= 2022 THEN 'Euro5'
    WHEN manufacture_year >= 2017 THEN 'Euro4'
    WHEN manufacture_year >= 2007 THEN 'Euro3'
    ELSE 'Euro2' END;
ALTER TABLE vehicles ALTER COLUMN emission_standard SET NOT NULL;
ALTER TABLE vehicles ADD CONSTRAINT ck_vehicles_emission CHECK (emission_standard IN ('Euro2','Euro3','Euro4','Euro5','EV'));
