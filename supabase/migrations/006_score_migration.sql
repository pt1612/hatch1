-- Migrate challenge dimension scores from old convention (low = harder) to new (high = harder).
-- Formula: new_score = 11 - old_score  (e.g. old 4 "few obstacles" → new 7 "many obstacles")
-- Idempotent: skips evaluations already marked with migrated_v1 flag.

DO $$
DECLARE
  eval   RECORD;
  r      JSONB;
  k      TEXT;
  challenge_keys TEXT[] := ARRAY['implementation_obstacles', 'time_to_revenue', 'external_risks'];
  old_sc INT;
  new_sc INT;
  new_avg FLOAT;
BEGIN
  FOR eval IN
    SELECT id, opportunity_id, report
    FROM evaluations
    WHERE report IS NOT NULL
      AND (report->>'migrated_v1') IS NULL
  LOOP
    r := eval.report;

    -- Invert each challenge dimension score
    FOREACH k IN ARRAY challenge_keys LOOP
      IF r->k IS NOT NULL AND r->k->>'score' IS NOT NULL THEN
        old_sc := (r->k->>'score')::INT;
        new_sc := GREATEST(1, LEAST(10, 11 - old_sc));

        r := jsonb_set(r, ARRAY[k, 'score'], to_jsonb(new_sc));
        r := jsonb_set(r, ARRAY[k, 'label'],
          CASE
            WHEN new_sc >= 9 THEN '"super_high"'::jsonb
            WHEN new_sc >= 6 THEN '"high"'::jsonb
            WHEN new_sc >= 4 THEN '"mid"'::jsonb
            ELSE '"low"'::jsonb
          END
        );
      END IF;
    END LOOP;

    -- Recalculate overall_challenge from the new scores
    IF r->'implementation_obstacles'->>'score' IS NOT NULL
       AND r->'time_to_revenue'->>'score' IS NOT NULL
       AND r->'external_risks'->>'score' IS NOT NULL
    THEN
      new_avg := (
        (r->'implementation_obstacles'->>'score')::FLOAT +
        (r->'time_to_revenue'->>'score')::FLOAT +
        (r->'external_risks'->>'score')::FLOAT
      ) / 3.0;

      r := jsonb_set(r, '{overall_challenge}',
        CASE
          WHEN new_avg >= 9 THEN '"super_high"'::jsonb
          WHEN new_avg >= 6 THEN '"high"'::jsonb
          WHEN new_avg >= 4 THEN '"mid"'::jsonb
          ELSE '"low"'::jsonb
        END
      );
    END IF;

    -- Stamp migration marker
    r := jsonb_set(r, '{migrated_v1}', 'true');

    UPDATE evaluations SET report = r WHERE id = eval.id;

    -- Keep opportunities.challenge_score in sync
    UPDATE opportunities
    SET challenge_score = r->>'overall_challenge'
    WHERE id = eval.opportunity_id;
  END LOOP;
END $$;
