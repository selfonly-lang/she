-- Read-only, privileged operator export; keep output private. Run in a consistent snapshot.
SELECT jsonb_build_object(
 'products', (SELECT coalesce(jsonb_agg(p ORDER BY p.id),'[]'::jsonb) FROM public.she_products p),
 'prices', (SELECT coalesce(jsonb_agg(p ORDER BY p.product_id,p.price_key),'[]'::jsonb) FROM public.she_prices p)
) AS snapshot;
