import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useSearchParams, Navigate } from 'react-router-dom'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { getGenre, generalRequirements } from '../data/genres'

const submissionSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  authorName: z.string().min(1, 'Name is required').max(100),
  authorEmail: z.string().email('Enter a valid email'),
  mailingAddress: z.string().min(1, 'Mailing address is required').max(200),
  hanoverStudent: z.boolean(),
  bio: z
    .string()
    .max(500, 'Keep bio under 500 characters')
    .optional()
    .or(z.literal('')),
  manuscript: z
    .instanceof(FileList)
    .refine((files) => files.length === 1, 'Attach one manuscript file')
    .refine(
      (files) => files.length === 0 || files[0].size <= 10 * 1024 * 1024,
      'File must be under 10 MB',
    ),
})

type SubmissionFormValues = z.input<typeof submissionSchema>

function SubmitPage() {
  const [submitted, setSubmitted] = useState(false)
  const [searchParams] = useSearchParams()
  const genreSlug = searchParams.get('genre') ?? ''
  const genre = genreSlug ? getGenre(genreSlug) : undefined

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SubmissionFormValues>({
    resolver: zodResolver(submissionSchema),
    defaultValues: {
      title: '',
      authorName: '',
      authorEmail: '',
      mailingAddress: '',
      hanoverStudent: false,
      bio: '',
    },
  })

  if (!genre) {
    return <Navigate to="/submit/genre" replace />
  }

  const onSubmit = (values: SubmissionFormValues) => {
    console.log('submission', { genre: genre.name, ...values })
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="page">
        <h1>Submission received</h1>
        <p className="lede">
          Thanks! Once email is wired up, a status link will be sent here. For
          now, this confirms the form works and validates.
        </p>
        <p className="back-link">
          <Link to="/">← Back to home</Link>
        </p>
      </div>
    )
  }

  return (
    <div className="page">
      <h1>{genre.name} Submission</h1>
      <p className="lede">
        Your name, email, mailing address, and bio are private — readers never
        see them.
      </p>

      <div className="rules-block">
        <h2>{genre.name} rules</h2>
        <ul className="rules">
          {genre.rules.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
        <h2>General requirements</h2>
        <ul className="rules">
          {generalRequirements.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
      </div>

      <form className="form" onSubmit={handleSubmit(onSubmit)}>
        <label>
          Title
          <input type="text" placeholder="Title of the piece" {...register('title')} />
          {errors.title && <span className="error">{errors.title.message}</span>}
        </label>

        <label>
          Your name
          <input type="text" placeholder="Author name" {...register('authorName')} />
          {errors.authorName && (
            <span className="error">{errors.authorName.message}</span>
          )}
        </label>

        <label>
          Your email
          <input
            type="email"
            placeholder="you@example.com"
            {...register('authorEmail')}
          />
          {errors.authorEmail && (
            <span className="error">{errors.authorEmail.message}</span>
          )}
        </label>

        <label>
          Mailing address
          <input
            type="text"
            placeholder="Street, city, state, ZIP"
            {...register('mailingAddress')}
          />
          {errors.mailingAddress && (
            <span className="error">{errors.mailingAddress.message}</span>
          )}
        </label>

        <label className="checkbox">
          <input type="checkbox" {...register('hanoverStudent')} />
          I am or have been a Hanover student
        </label>

        <label>
          Bio (optional)
          <textarea
            rows={3}
            placeholder="One or two sentences"
            {...register('bio')}
          />
          {errors.bio && <span className="error">{errors.bio.message}</span>}
        </label>

        <label>
          Manuscript
          <input
            type="file"
            accept={genre.fileTypes}
            {...register('manuscript')}
          />
          <span className="hint">{genre.fileHint}</span>
          {errors.manuscript && (
            <span className="error">{errors.manuscript.message}</span>
          )}
        </label>

        <button type="submit" className="btn">
          Submit
        </button>
      </form>
    </div>
  )
}

export default SubmitPage