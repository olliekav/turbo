import { FormSubmission } from "../core/drive/form_submission"

export interface FormSubmitObserverDelegate {
  willSubmitForm(formSubmission: FormSubmission): boolean
  formSubmitted(formSubmitted: FormSubmission): void
}

export class FormSubmitObserver {
  readonly delegate: FormSubmitObserverDelegate
  started = false

  constructor(delegate: FormSubmitObserverDelegate) {
    this.delegate = delegate
  }

  start() {
    if (!this.started) {
      addEventListener("submit", this.submitCaptured, true)
      this.started = true
    }
  }

  stop() {
    if (this.started) {
      removeEventListener("submit", this.submitCaptured, true)
      this.started = false
    }
  }

  submitCaptured = () => {
    removeEventListener("submit", this.submitBubbled, false)
    addEventListener("submit", this.submitBubbled, false)
  }

  submitBubbled = <EventListener>((event: SubmitEvent) => {
    if (!event.defaultPrevented) {
      const form = event.target instanceof HTMLFormElement ? event.target : null
      const submitter = event.submitter

      if (form) {
        const formSubmission = new FormSubmission(form, event.submitter)
        const method = submitter?.getAttribute("formmethod") || form.method

        if (method != "dialog" && this.delegate.willSubmitForm(formSubmission)) {
          event.preventDefault()
          this.delegate.formSubmitted(formSubmission)
        }
      }
    }
  })
}
