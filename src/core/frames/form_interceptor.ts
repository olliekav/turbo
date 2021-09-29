import { FormSubmission } from "../drive/form_submission"

export interface FormInterceptorDelegate {
  shouldInterceptFormSubmission(formSubmission: FormSubmission): boolean
  formSubmissionIntercepted(formSubmission: FormSubmission): void
}

export class FormInterceptor {
  readonly delegate: FormInterceptorDelegate
  readonly element: Element

  constructor(delegate: FormInterceptorDelegate, element: Element) {
    this.delegate = delegate
    this.element = element
  }

  start() {
    this.element.addEventListener("submit", this.submitBubbled)
  }

  stop() {
    this.element.removeEventListener("submit", this.submitBubbled)
  }

  submitBubbled = <EventListener>((event: SubmitEvent) => {
    const form = event.target
    if (form instanceof HTMLFormElement && form.closest("turbo-frame, html") == this.element) {
      const submitter = event.submitter
      const formSubmission = new FormSubmission(form, submitter)
      if (this.delegate.shouldInterceptFormSubmission(formSubmission)) {
        event.preventDefault()
        event.stopImmediatePropagation()
        this.delegate.formSubmissionIntercepted(formSubmission)
      }
    }
  })
}
