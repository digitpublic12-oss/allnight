import PlaceEditor from "@/features/admin/PlaceEditor";

export default async function AdminPlaceEdit({ params }: PageProps<"/admin/places/[placeId]/edit">) {
  const { placeId } = await params;
  return <PlaceEditor placeId={placeId} />;
}
