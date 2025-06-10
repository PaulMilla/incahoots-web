import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { getEventAttendeesPublisher } from "@/lib/firestore";
import { filterNullish } from "@/lib/rxjs";
import { Attendee } from "@/types";
import { ChevronRight, CircleHelp, FileQuestion, Mail, SquareCheck, SquareX, X } from "lucide-react";
import { useEffect, useState } from "react";

export function InviteModal({ eventId }: { eventId?: string }) {
  const [people, setPeople] = useState<Person[]>([{
      id: uuidv4(),
      idType: "phone",
      name: "Steph",
      phone: "2149787410"
  }, {
      id: uuidv4(),
      idType: "email",
      name: "Daniel",
      email: "drobertson@gmail.com"
  }, {
      id: uuidv4(),
      idType: "email",
      email: "other1@gmail.com"
  }, {
      id: uuidv4(),
      idType: "phone",
      phone: "123-456-76890"
  }, {
      id: uuidv4(),
      idType: "email",
      name: "Other3",
      email: "other3@gmail.com"
  }, {
      id: uuidv4(),
      idType: "email",
      name: "Other4",
      email: "other4@gmail.com"
  }, {
      id: uuidv4(),
      idType: "email",
      name: "Other5",
      email: "other5@gmail.com"
  }, {
      id: uuidv4(),
      idType: "email",
      name: "Other6",
      email: "other6@gmail.com"
  }, {
      id: uuidv4(),
      idType: "email",
      name: "Other7",
      email: "other7@gmail.com"
  }, {
      id: uuidv4(),
      idType: "email",
      name: "Other8",
      email: "other8@gmail.com"
  }, {
      id: uuidv4(),
      idType: "email",
      name: "Other9",
      email: "other9@gmail.com"
  }, {
      id: uuidv4(),
      idType: "email",
      name: "Other10",
      email: "other10@gmail.com"
  }, {
      id: uuidv4(),
      idType: "email",
      name: "Other11",
      email: "other11@gmail.com"
  }, {
      id: uuidv4(),
      idType: "email",
      name: "Other12",
      email: "other12@gmail.com"
  }, {
      id: uuidv4(),
      idType: "email",
      name: "Other13",
      email: "other13@gmail.com"
  }, {
      id: uuidv4(),
      idType: "email",
      name: "Other14",
      email: "other14@gmail.com"
  }, {
      id: uuidv4(),
      idType: "email",
      name: "Other15",
      email: "other15@gmail.com"
  }]);

  const [attendees, setAttendees] = useState<Attendee[]>([]);


  useEffect(() => {
    if (!eventId) {
      console.error("Event id not found in query params");
      return;
    }

    // getEventDetailsPublisher(eventId)
    // .subscribe(eventDetails => {
    //   setEventDetails(eventDetails)
    // })

    getEventAttendeesPublisher(eventId)
      .pipe(filterNullish())
      .subscribe((attendees: Attendee[]) => {
        setAttendees(attendees);
      });

  }, [eventId]);


  const removeInvite = (person: Person) => {
    const newPeople = people.filter(x => x != person)
    setPeople(newPeople)
  }

  const onAddInvite = (person: Person) => {
    setPeople([person, ...people])
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Invite Contacts</Button>
      </DialogTrigger>
      {/* <DialogContent className="sm:max-w-[425px]"> */}
      <DialogContent>

        <DialogHeader>
          <DialogTitle>Invite Contacts</DialogTitle>
          <DialogDescription>
            Invite your friends here!
          </DialogDescription>
        </DialogHeader>

        <div id="DialogBody" className="flex items-center space-x-4">
          <div id="DialogBody-Left" className="grid gap-4">
            <CommandBox onAddInvite={onAddInvite} />
          </div>
          <Separator orientation="vertical" />
          <div id="DialogBody-Right" className="md:min-w-[200px] flex-grow">
            <h1 className="text-lg">Guest List</h1>
            <ScrollArea className="h-72 rounded-md border p-2">
              {people.map(x =>
                <GuestListItem key={x.id} person={x} actionType={ActionType.remove} onActionClicked={() => removeInvite(x)} />
              )}
            </ScrollArea>
            <h1 className="pt-10">Already Invited</h1>
            <ScrollArea className="max-h-72 rounded-md border p-2">
              {attendees.map(x =>
                <GuestListAttendee key={x.id} attendee={x} />
              )}
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <DialogDescription>
            Adding invites to a draft event doesn't send them out until the event is published
          </DialogDescription>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button type="submit">Save Invites</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function CommandBox({ onAddInvite }: { onAddInvite: (person: Person) => void }) {
  const [searchValue, setSearchValue] = useState<string>()
  const [pages, setPages] = useState<string[]>([])
  const page = pages[pages.length - 1]

  const onSubmitPerson = (person: Person) => {
    onAddInvite(person)
    setPages((pages) => pages.slice(0, -1));
    setSearchValue("")
  };

  return (
    <Command onKeyUp={(e) => {
      // Escape goes to previous page
      // Backspace goes to previous page when search is empty
      if (e.key === 'Escape' || (e.code === 'Backspace' && !searchValue)) {
        e.preventDefault()
        setPages((pages) => pages.slice(0, -1))
      }
    }}>
      <CommandInput placeholder="Type a person's name, email, or phone number..." value={searchValue} onValueChange={setSearchValue} />
      <CommandList>
        {!page && !searchValue && (
          <CommandEmpty>No recent contacts. Try adding some manually using the quick add option...</CommandEmpty>
        )}
        {/* <CommandGroup heading="Suggestions">
          <CommandItem>Calendar</CommandItem>
          <CommandItem>Search Emoji</CommandItem>
          <CommandItem>Calculator</CommandItem>
        </CommandGroup>
        <CommandSeparator /> */}
        {!page && searchValue && (
          <CommandGroup forceMount heading="Quick add..">
            <CommandItem forceMount onSelect={() => setPages([...pages, 'quickAdd'])} >Quick add contact for {searchValue}..</CommandItem>
          </CommandGroup>
        )}
        {page === "quickAdd" && searchValue && (
          <QuickAddForm searchValue={searchValue} onSubmit={onSubmitPerson} />
        )}
      </CommandList>
    </Command>
  )
}

function QuickAddForm({ searchValue, onSubmit }: { searchValue: string, onSubmit: (person: Person) => void }) {
  const searchType =
    searchValue.includes('@') ? 'email'
      : /^[0-9-]+$/.test(searchValue) ? 'phone'
        : 'name';

  // TOOD: Replace with React Hook Form from shadcn: https://ui.shadcn.com/docs/components/form
  const [name, setName] = useState<string>(searchType == 'name' ? searchValue : '')
  const [email, setEmail] = useState<string>(searchType == 'email' ? searchValue : '')
  const [phone, setPhone] = useState<string>(searchType == 'phone' ? searchValue : '')

  return (
    <div className="p-2">
      <h1 className="text-md">Quick Add...</h1>
      <h3 className="text-sm">Either email or phone must be defined</h3>
      <Input placeholder="Name (optional)" value={name} autoFocus={searchType != 'name'} type="text" onChange={e => setName(e.currentTarget.value)}></Input>
      <Input placeholder="Email (optional)" value={email} autoFocus={searchType == 'name'} type="email" onChange={e => setEmail(e.currentTarget.value)}></Input>
      <Input placeholder="Phone (optional)" value={phone} type="phone" onChange={e => setPhone(e.currentTarget.value)}></Input>
      <Button asChild variant={"outline"}>
        <ChevronRight onClick={() => { onSubmit({ id: uuidv4(), name, email, phone } as Person) }} />
      </Button>
    </div>
  )
}

enum ActionType {
  'remove',
  'add',
  'moreInfo'
}

function GuestListAttendee({ attendee }: { attendee: Attendee, actionType?: ActionType, onActionClicked?: () => void }) {
  return (
    <div className="flex space-x-2 justify-between">
      <span key={attendee.id}>{attendee.fullName ?? "???"}</span>
      {attendee.rsvpState === 'going' && (<SquareCheck />)}
      {attendee.rsvpState === 'notGoing' && (<SquareX />)}
      {attendee.rsvpState === 'maybe' && (<CircleHelp />)}
      {attendee.rsvpState === 'unknown' && (<Mail />)}
    </div>
  )
}

function GuestListItem({ person, actionType, onActionClicked }: { person: Person, actionType?: ActionType, onActionClicked?: () => void }) {
  const actionButton = () => {
    switch (actionType) {
      case ActionType.remove: return (<X onClick={onActionClicked} />)
      default: return (<FileQuestion onClick={onActionClicked} />)
    }
  };

  return (
    <div className="flex space-x-2 justify-between">
      <span key={person.id}>{person.name ?? (person.idType == 'phone' ? person.phone : person.email) ?? "???"}</span>
      {actionType !== undefined ? actionButton() : <></>}
    </div>
  )
}

class Person {
  id!: string;
  idType!: "phone" | "email";
  name?: string | undefined;
  email?: string | undefined;
  phone?: string | undefined;
}

// TODO: Fix this with real ID definitions
function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
