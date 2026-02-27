-- Grant execute permission on get_portal_data to anon role so unauthenticated clients can call it
GRANT EXECUTE ON FUNCTION public.get_portal_data(text) TO anon;

-- Also grant execute to authenticated just in case
GRANT EXECUTE ON FUNCTION public.get_portal_data(text) TO authenticated;

-- Grant insert on portal_comments to anon so clients can leave comments without logging in
GRANT INSERT ON TABLE public.portal_comments TO anon;
