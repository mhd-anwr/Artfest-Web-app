-- Assign the next result number atomically when an admin finishes a programme.
-- Run this once in Supabase Dashboard -> SQL Editor.

CREATE OR REPLACE FUNCTION public.admin_assign_next_result_no(
  p_programme_id text,
  p_programme_name text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result_id uuid;
  v_next_result_no integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('error', 'not_authorized');
  END IF;

  -- Serialize all result-number assignments, so max + 1 cannot collide.
  PERFORM pg_advisory_xact_lock(hashtext('artfest-result-number-assignment'));

  SELECT COALESCE(MAX("resultNo"), 0) + 1
    INTO v_next_result_no
  FROM public.results
  WHERE "resultNo" > 0;

  SELECT id
    INTO v_result_id
  FROM public.results
  WHERE "programmeId" = p_programme_id
  ORDER BY "updatedAt" DESC NULLS LAST
  LIMIT 1;

  IF v_result_id IS NULL THEN
    INSERT INTO public.results
      ("programmeId", name, entries, first, second, third, "resultNo", locked, "updatedAt")
    VALUES
      (p_programme_id, COALESCE(p_programme_name, 'Programme'), '[]'::jsonb,
       NULL, NULL, NULL, v_next_result_no, false, now());
  ELSE
    UPDATE public.results
    SET "resultNo" = v_next_result_no,
        "updatedAt" = now()
    WHERE id = v_result_id;
  END IF;

  RETURN jsonb_build_object('ok', true, 'result_no', v_next_result_no);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_assign_next_result_no(text, text)
  TO authenticated;

NOTIFY pgrst, 'reload schema';
