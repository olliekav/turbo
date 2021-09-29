export interface FormSubmitObserverDelegate {
  willSubmitForm(form: HTMLFormElement, submitter: HTMLElement | null): boolean
  formSubmitted(form: HTMLFormElement, submitter: HTMLElement | null): void
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
        const method = submitter?.getAttribute("formmethod") || form.method

        if (method != "dialog" && this.delegate.willSubmitForm(form, submitter)) {
          event.preventDefault()
          this.delegate.formSubmitted(form, submitter)
        }
      }
    }
  })
}
