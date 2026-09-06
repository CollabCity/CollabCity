import { RatingStars } from "@/components/rating-stars";
import { ReportDialog } from "@/components/report-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { RATING_LABELS, type Rating } from "@/lib/reputation";
import { initials } from "@/lib/utils";

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: Date;
  authorId: string;
  authorName: string;
  authorImage: string | null;
  listingTitle: string;
};

export function ReviewList({
  reviews,
  viewerId,
  reportedIds,
}: {
  reviews: Review[];
  /** Quem está lendo, quando há sessão. Só ele pode denunciar. */
  viewerId?: string | undefined;
  reportedIds?: Set<string> | undefined;
}) {
  return (
    <ul className="grid gap-3">
      {reviews.map((review) => (
        <li key={review.id}>
          <Card>
            <CardContent className="space-y-3 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Avatar className="size-9">
                    {review.authorImage && <AvatarImage src={review.authorImage} alt="" />}
                    <AvatarFallback>{initials(review.authorName)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">{review.authorName}</p>
                    <p className="text-muted-foreground text-xs">
                      <time dateTime={review.createdAt.toISOString()}>
                        {review.createdAt.toLocaleDateString("pt-BR")}
                      </time>
                      {" · "}
                      {review.listingTitle}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <RatingStars value={review.rating} starClassName="size-3.5" />
                  <span className="text-muted-foreground text-xs">
                    {RATING_LABELS[review.rating as Rating]}
                  </span>
                </div>
              </div>

              {review.comment && (
                <p className="text-pretty text-sm leading-relaxed">{review.comment}</p>
              )}

              {/* Quem escreveu não denuncia a própria avaliação; a ação existe
                  para quem foi avaliado e para quem lê algo abusivo. */}
              {viewerId && viewerId !== review.authorId && (
                <ReportDialog
                  target="review"
                  targetId={review.id}
                  alreadyReported={reportedIds?.has(review.id) ?? false}
                  className="-ml-2"
                />
              )}
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  );
}
