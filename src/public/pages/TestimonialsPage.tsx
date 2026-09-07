import { useLoaderData } from 'react-router-dom';
import { SeoHead } from '../components/ui/SeoHead';
import { Section } from '../components/ui/Section';
import { TestimonialCard } from '../components/cards';
import { TestimonialForm } from '../forms/TestimonialForm';
import { getTestimonials } from '../../shared/content/queries';

export async function testimonialsLoader() {
  return { testimonials: await getTestimonials() };
}
type Data = Awaited<ReturnType<typeof testimonialsLoader>>;

export function TestimonialsPage() {
  const { testimonials } = useLoaderData() as Data;
  return (
    <>
      <SeoHead
        title="Testimonials — Platinum Point Automotive Engineering"
        description="What Platinum Point customers say about our mobile mechanic and engineering work."
        path="/testimonials"
      />
      <Section eyebrow="Testimonials" title="What customers say">
        {testimonials.length === 0 ? (
          <p className="text-[color:var(--color-muted)]">
            No testimonials published yet. If we&rsquo;ve worked on your vehicle, we&rsquo;d be glad
            if you left one below.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {testimonials.map((t) => (
              <TestimonialCard key={t.id} t={t} />
            ))}
          </div>
        )}
      </Section>
      <Section eyebrow="Leave a testimonial" title="Worked with us?" tint narrow>
        <TestimonialForm />
      </Section>
    </>
  );
}
